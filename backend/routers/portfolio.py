from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
from services.auth_service import get_current_user
from services.stock_service import get_stock_prices, get_stock_quote
from services.import_service import extract_holdings

router = APIRouter(prefix="/api/portfolios", tags=["Portfolios"])


def calculate_holding_metrics(holding: models.Holding, current_price: float, total_portfolio_value: float) -> dict:
    """Calculate computed metrics for a holding"""
    current_value = holding.quantity * current_price
    invested_value = holding.quantity * holding.avg_buy_price
    profit_loss = current_value - invested_value
    profit_loss_percent = (profit_loss / invested_value * 100) if invested_value > 0 else 0
    actual_allocation = (current_value / total_portfolio_value * 100) if total_portfolio_value > 0 else 0
    drift = actual_allocation - holding.target_allocation
    
    return {
        "current_price": current_price,
        "current_value": current_value,
        "profit_loss": profit_loss,
        "profit_loss_percent": profit_loss_percent,
        "actual_allocation": actual_allocation,
        "drift": drift
    }


@router.get("/", response_model=List[schemas.PortfolioSummary])
async def get_portfolios(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all portfolios for current user"""
    portfolios = db.query(models.Portfolio).filter(
        models.Portfolio.user_id == current_user.id
    ).all()
    
    result = []
    for portfolio in portfolios:
        tickers = [h.ticker for h in portfolio.holdings]
        prices = await get_stock_prices(tickers) if tickers else {}
        
        total_value = sum(
            h.quantity * prices.get(h.ticker, h.avg_buy_price)
            for h in portfolio.holdings
        )
        
        result.append({
            "id": portfolio.id,
            "name": portfolio.name,
            "total_value": total_value,
            "holding_count": len(portfolio.holdings)
        })
    
    return result


@router.post("/", response_model=schemas.PortfolioResponse, status_code=status.HTTP_201_CREATED)
async def create_portfolio(
    portfolio_data: schemas.PortfolioCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new portfolio"""
    portfolio = models.Portfolio(
        name=portfolio_data.name,
        description=portfolio_data.description,
        is_default=portfolio_data.is_default,
        user_id=current_user.id
    )
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    return portfolio


@router.get("/{portfolio_id}", response_model=schemas.PortfolioResponse)
async def get_portfolio(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific portfolio with holdings and metrics"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Get current prices for all holdings
    tickers = [h.ticker for h in portfolio.holdings]
    prices = await get_stock_prices(tickers) if tickers else {}
    
    # Calculate total portfolio value first
    total_value = sum(
        h.quantity * prices.get(h.ticker, h.avg_buy_price)
        for h in portfolio.holdings
    )
    total_invested = sum(h.quantity * h.avg_buy_price for h in portfolio.holdings)
    
    # Enrich holdings with computed fields
    enriched_holdings = []
    for holding in portfolio.holdings:
        current_price = prices.get(holding.ticker, holding.avg_buy_price)
        metrics = calculate_holding_metrics(holding, current_price, total_value)
        
        holding_dict = {
            "id": holding.id,
            "ticker": holding.ticker,
            "name": holding.name,
            "asset_type": holding.asset_type,
            "quantity": holding.quantity,
            "avg_buy_price": holding.avg_buy_price,
            "target_allocation": holding.target_allocation,
            "portfolio_id": holding.portfolio_id,
            "created_at": holding.created_at,
            **metrics
        }
        enriched_holdings.append(holding_dict)
    
    return {
        "id": portfolio.id,
        "name": portfolio.name,
        "description": portfolio.description,
        "is_default": portfolio.is_default,
        "user_id": portfolio.user_id,
        "created_at": portfolio.created_at,
        "holdings": enriched_holdings,
        "total_value": total_value,
        "total_invested": total_invested,
        "total_profit_loss": total_value - total_invested,
        "total_profit_loss_percent": ((total_value - total_invested) / total_invested * 100) if total_invested > 0 else 0
    }


@router.put("/{portfolio_id}", response_model=schemas.PortfolioResponse)
async def update_portfolio(
    portfolio_id: int,
    portfolio_data: schemas.PortfolioUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a portfolio"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    if portfolio_data.name:
        portfolio.name = portfolio_data.name
    if portfolio_data.description is not None:
        portfolio.description = portfolio_data.description
    
    db.commit()
    db.refresh(portfolio)
    return portfolio


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_portfolio(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a portfolio"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    if portfolio.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default portfolio")
    
    db.delete(portfolio)
    db.commit()


# ============== Holdings Endpoints ==============

@router.post("/{portfolio_id}/holdings", response_model=schemas.HoldingResponse, status_code=status.HTTP_201_CREATED)
async def add_holding(
    portfolio_id: int,
    holding_data: schemas.HoldingCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new holding to a portfolio"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    # Check if holding already exists
    existing = db.query(models.Holding).filter(
        models.Holding.portfolio_id == portfolio_id,
        models.Holding.ticker == holding_data.ticker
    ).first()
    
    if existing:
        # Update existing holding (average up/down)
        total_qty = existing.quantity + holding_data.quantity
        total_cost = (existing.quantity * existing.avg_buy_price) + (holding_data.quantity * holding_data.avg_buy_price)
        existing.quantity = total_qty
        existing.avg_buy_price = total_cost / total_qty
        if holding_data.target_allocation:
            existing.target_allocation = holding_data.target_allocation
        db.commit()
        db.refresh(existing)
        holding = existing
    else:
        holding = models.Holding(
            ticker=holding_data.ticker,
            name=holding_data.name,
            asset_type=holding_data.asset_type,
            quantity=holding_data.quantity,
            avg_buy_price=holding_data.avg_buy_price,
            target_allocation=holding_data.target_allocation,
            portfolio_id=portfolio_id
        )
        db.add(holding)
        db.commit()
        db.refresh(holding)
    
    # Record transaction
    transaction = models.Transaction(
        ticker=holding_data.ticker,
        transaction_type=models.TransactionType.BUY,
        quantity=holding_data.quantity,
        price=holding_data.avg_buy_price,
        total_amount=holding_data.quantity * holding_data.avg_buy_price,
        portfolio_id=portfolio_id
    )
    db.add(transaction)
    db.commit()
    
    return holding


@router.put("/{portfolio_id}/holdings/{holding_id}", response_model=schemas.HoldingResponse)
async def update_holding(
    portfolio_id: int,
    holding_id: int,
    holding_data: schemas.HoldingUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a holding"""
    # Verify portfolio ownership
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    holding = db.query(models.Holding).filter(
        models.Holding.id == holding_id,
        models.Holding.portfolio_id == portfolio_id
    ).first()
    
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    
    if holding_data.quantity is not None:
        holding.quantity = holding_data.quantity
    if holding_data.avg_buy_price is not None:
        holding.avg_buy_price = holding_data.avg_buy_price
    if holding_data.target_allocation is not None:
        holding.target_allocation = holding_data.target_allocation
    
    db.commit()
    db.refresh(holding)
    return holding


@router.delete("/{portfolio_id}/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holding(
    portfolio_id: int,
    holding_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a holding from portfolio"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    holding = db.query(models.Holding).filter(
        models.Holding.id == holding_id,
        models.Holding.portfolio_id == portfolio_id
    ).first()
    
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    
    # Record sell transaction
    quote = await get_stock_quote(holding.ticker)
    current_price = quote.get("price", holding.avg_buy_price) if quote else holding.avg_buy_price
    
    transaction = models.Transaction(
        ticker=holding.ticker,
        transaction_type=models.TransactionType.SELL,
        quantity=holding.quantity,
        price=current_price,
        total_amount=holding.quantity * current_price,
        portfolio_id=portfolio_id
    )
    db.add(transaction)
    
    db.delete(holding)
    db.commit()


# ============== Transactions Endpoints ==============

@router.get("/{portfolio_id}/transactions", response_model=List[schemas.TransactionResponse])
async def get_transactions(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all transactions for a portfolio"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    transactions = db.query(models.Transaction).filter(
        models.Transaction.portfolio_id == portfolio_id
    ).order_by(models.Transaction.executed_at.desc()).limit(100).all()
    
    return transactions


@router.post("/{portfolio_id}/import", status_code=status.HTTP_201_CREATED)
async def import_holdings(
    portfolio_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import holdings from broker CSV/Excel file"""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    try:
        content = await file.read()
        holdings_list, metadata = extract_holdings(content, file.filename)
        
        imported_count = 0
        
        for item in holdings_list:
            # Check if holding exists
            existing = db.query(models.Holding).filter(
                models.Holding.portfolio_id == portfolio_id,
                models.Holding.ticker == item['ticker']
            ).first()
            
            if existing:
                # Update existing (average down/up)
                total_qty = existing.quantity + item['quantity']
                total_cost = (existing.quantity * existing.avg_buy_price) + (item['quantity'] * item['avg_buy_price'])
                
                # Update details
                existing.quantity = total_qty
                if total_qty > 0:
                    existing.avg_buy_price = total_cost / total_qty
                
                # Create BUY transaction for the addition
                transaction = models.Transaction(
                    ticker=item['ticker'],
                    transaction_type=models.TransactionType.BUY,
                    quantity=item['quantity'],
                    price=item['avg_buy_price'],
                    total_amount=item['quantity'] * item['avg_buy_price'],
                    portfolio_id=portfolio_id,
                    notes=f"Imported from {metadata['detected_broker']}"
                )
                db.add(transaction)
                imported_count += 1
            else:
                # Create new holding
                new_holding = models.Holding(
                    ticker=item['ticker'],
                    name=item['name'] or item['ticker'],
                    asset_type="EQUITY",  # Default to equity
                    quantity=item['quantity'],
                    avg_buy_price=item['avg_buy_price'],
                    portfolio_id=portfolio_id
                )
                db.add(new_holding)
                
                # Transaction
                transaction = models.Transaction(
                    ticker=item['ticker'],
                    transaction_type=models.TransactionType.BUY,
                    quantity=item['quantity'],
                    price=item['avg_buy_price'],
                    total_amount=item['quantity'] * item['avg_buy_price'],
                    portfolio_id=portfolio_id,
                    notes=f"Imported from {metadata['detected_broker']}"
                )
                db.add(transaction)
                imported_count += 1
        
        db.commit()
        
        return {
            "message": f"Successfully imported {imported_count} holdings",
            "metadata": metadata
        }
        
    except Exception as e:
        db.rollback()
        # Log the error for debugging
        print(f"Import Error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")
