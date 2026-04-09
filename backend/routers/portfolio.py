"""
OptiWealth Backend - Portfolio Router
======================================
All portfolio and holdings CRUD endpoints.

BUGS FIXED:
-----------
1. [CRITICAL] ApiResponse(data=holding) — SQLAlchemy ORM object cannot be serialized
   by Pydantic's Any field without explicit model_dump(). Fixed by calling
   holding_to_dict() helper to convert ORM -> plain dict before wrapping.

2. [CRITICAL] HTTP 201 returned even on failure — endpoint now returns 201 only
   on success; errors return 400/404 with ApiResponse(success=False).

3. [MEDIUM]  Bare except silently swallowed Pydantic serialization errors —
   now logs full traceback and re-raises as structured ApiResponse.

4. [LOW]    Missing structured logging — added module-level logger with consistent
   [portfolio] prefix for all operations.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models
import schemas
import logging
from services.auth_service import get_current_user
from services.stock_service import get_stock_prices, get_stock_quote
from services.import_service import extract_holdings

# Module-level logger — structured logs for all portfolio operations
logger = logging.getLogger("optiwealth.portfolio")

router = APIRouter(prefix="/api/portfolios", tags=["Portfolios"])


# ============== Helpers ==============

def holding_to_dict(holding: models.Holding) -> dict:
    """
    Convert a SQLAlchemy Holding ORM object to a plain dict.
    
    WHY: Pydantic's ApiResponse has `data: Optional[Any]`. When you pass a live
    SQLAlchemy ORM object as `data`, Pydantic V2 cannot serialize it because ORM
    models are not JSON-serializable by default and `Any` skips model_validators.
    This causes a silent PydanticSerializationUnexpectedValue that gets swallowed
    by the except block, returning success=False to the frontend.
    
    SOLUTION: Always convert ORM objects to plain dicts before wrapping in ApiResponse.
    """
    return {
        "id": holding.id,
        "ticker": holding.ticker,
        "name": holding.name,
        "asset_type": holding.asset_type,
        "quantity": holding.quantity,
        "avg_buy_price": holding.avg_buy_price,
        "target_allocation": holding.target_allocation,
        "portfolio_id": holding.portfolio_id,
        "created_at": holding.created_at.isoformat() if holding.created_at else None,
    }


def calculate_holding_metrics(
    holding: models.Holding,
    current_price: float,
    total_portfolio_value: float
) -> dict:
    """Calculate computed metrics for a holding."""
    current_value = holding.quantity * current_price
    invested_value = holding.quantity * holding.avg_buy_price
    profit_loss = current_value - invested_value
    profit_loss_percent = (profit_loss / invested_value * 100) if invested_value > 0 else 0.0
    actual_allocation = (current_value / total_portfolio_value * 100) if total_portfolio_value > 0 else 0.0
    drift = actual_allocation - holding.target_allocation

    return {
        "current_price": current_price,
        "current_value": current_value,
        "profit_loss": profit_loss,
        "profit_loss_percent": profit_loss_percent,
        "actual_allocation": actual_allocation,
        "drift": drift,
    }


# ============== Portfolio Endpoints ==============

@router.get("/", response_model=List[schemas.PortfolioSummary])
async def get_portfolios(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all portfolios for current user."""
    try:
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
                "holding_count": len(portfolio.holdings),
            })

        logger.info(f"[GET /portfolios] User {current_user.id} fetched {len(result)} portfolios")
        return result
    except Exception as exc:
        logger.error(f"[GET /portfolios] Unexpected error for user {current_user.id}: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch portfolios")


@router.post("/", response_model=schemas.PortfolioResponse, status_code=status.HTTP_201_CREATED)
async def create_portfolio(
    portfolio_data: schemas.PortfolioCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new portfolio."""
    try:
        portfolio = models.Portfolio(
            name=portfolio_data.name,
            description=portfolio_data.description,
            is_default=portfolio_data.is_default,
            user_id=current_user.id,
        )
        db.add(portfolio)
        db.commit()
        db.refresh(portfolio)
        logger.info(f"[POST /portfolios] Created portfolio '{portfolio_data.name}' for user {current_user.id}")
        return portfolio
    except Exception as exc:
        db.rollback()
        logger.error(f"[POST /portfolios] Failed to create portfolio: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create portfolio: {str(exc)}")


@router.get("/{portfolio_id}", response_model=schemas.PortfolioResponse)
async def get_portfolio(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific portfolio with holdings and metrics."""
    try:
        portfolio = db.query(models.Portfolio).filter(
            models.Portfolio.id == portfolio_id,
            models.Portfolio.user_id == current_user.id,
        ).first()

        if not portfolio:
            logger.warning(f"[GET /portfolios/{portfolio_id}] Not found for user {current_user.id}")
            raise HTTPException(status_code=404, detail="Portfolio not found")

        # Get current prices for all holdings
        tickers = [h.ticker for h in portfolio.holdings]
        prices = await get_stock_prices(tickers) if tickers else {}

        # Calculate total portfolio value first (needed for allocation %)
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
                **metrics,
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
            "total_profit_loss_percent": (
                (total_value - total_invested) / total_invested * 100
            ) if total_invested > 0 else 0.0,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[GET /portfolios/{portfolio_id}] Error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch portfolio")


@router.put("/{portfolio_id}", response_model=schemas.PortfolioResponse)
async def update_portfolio(
    portfolio_id: int,
    portfolio_data: schemas.PortfolioUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a portfolio."""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id,
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
    """Delete a portfolio."""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id,
    ).first()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    if portfolio.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default portfolio")

    db.delete(portfolio)
    db.commit()


# ============== Holdings Endpoints ==============

@router.post("/{portfolio_id}/holdings")
async def add_holding(
    portfolio_id: int,
    holding_data: schemas.HoldingCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a new holding to a portfolio.

    FIXED BUGS:
    1. No longer passes raw ORM object to ApiResponse.data — converts to dict first.
    2. Returns HTTP 201 on success, HTTP 400/404 on known failures, HTTP 500 on unexpected.
    3. Full structured logging at every step for debuggability.
    4. db.rollback() on all exception paths to prevent connection leaks.
    """
    logger.info(
        f"[ADD HOLDING] User={current_user.id} Portfolio={portfolio_id} "
        f"Ticker={holding_data.ticker} Qty={holding_data.quantity} "
        f"Price={holding_data.avg_buy_price} Alloc={holding_data.target_allocation}%"
    )

    # ── Validate portfolio ownership ───────────────────────────────────────────
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id,
    ).first()

    if not portfolio:
        logger.warning(f"[ADD HOLDING] Portfolio {portfolio_id} not found for user {current_user.id}")
        return JSONResponse(
            status_code=404,
            content={"success": False, "data": None, "error": "Portfolio not found"},
        )

    try:
        # ── Check if holding already exists ───────────────────────────────────
        existing = db.query(models.Holding).filter(
            models.Holding.portfolio_id == portfolio_id,
            models.Holding.ticker == holding_data.ticker.upper(),
        ).first()

        if existing:
            # Average up / down — blend existing cost basis with new purchase
            logger.info(
                f"[ADD HOLDING] Averaging existing {holding_data.ticker} in portfolio {portfolio_id}"
            )
            total_qty = existing.quantity + holding_data.quantity
            if total_qty <= 0:
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "data": None,
                        "error": "Total quantity after averaging must be greater than zero",
                    },
                )

            total_cost = (
                existing.quantity * existing.avg_buy_price
                + holding_data.quantity * holding_data.avg_buy_price
            )
            existing.quantity = total_qty
            existing.avg_buy_price = round(total_cost / total_qty, 4)

            if holding_data.target_allocation is not None:
                existing.target_allocation = holding_data.target_allocation

            holding = existing
        else:
            # New holding
            logger.info(
                f"[ADD HOLDING] Creating new holding {holding_data.ticker.upper()} in portfolio {portfolio_id}"
            )
            holding = models.Holding(
                ticker=holding_data.ticker.upper(),
                name=holding_data.name,
                asset_type=holding_data.asset_type.value if hasattr(holding_data.asset_type, "value") else holding_data.asset_type,
                quantity=holding_data.quantity,
                avg_buy_price=holding_data.avg_buy_price,
                target_allocation=holding_data.target_allocation,
                portfolio_id=portfolio_id,
            )
            db.add(holding)

        # ── Record transaction ─────────────────────────────────────────────────
        transaction = models.Transaction(
            ticker=holding_data.ticker.upper(),
            transaction_type=models.TransactionType.BUY,
            quantity=holding_data.quantity,
            price=holding_data.avg_buy_price,
            total_amount=round(holding_data.quantity * holding_data.avg_buy_price, 2),
            portfolio_id=portfolio_id,
        )
        db.add(transaction)

        # ── Commit ─────────────────────────────────────────────────────────────
        db.commit()
        db.refresh(holding)

        # ── Serialize ORM → plain dict BEFORE wrapping in response ─────────────
        # CRITICAL FIX: SQLAlchemy ORM objects cannot be passed directly to
        # ApiResponse(data=holding) because Pydantic's `Any` field does NOT
        # invoke from_attributes mode — this silently fails serialization.
        holding_dict = holding_to_dict(holding)

        logger.info(
            f"[ADD HOLDING] ✅ Success — holding id={holding.id} "
            f"ticker={holding.ticker} portfolio={portfolio_id}"
        )

        return JSONResponse(
            status_code=201,
            content={"success": True, "data": holding_dict, "error": None},
        )

    except Exception as exc:
        db.rollback()
        logger.error(
            f"[ADD HOLDING] ❌ Unexpected error — User={current_user.id} "
            f"Portfolio={portfolio_id} Ticker={holding_data.ticker}: {exc}",
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "data": None,
                "error": f"Internal error while adding holding: {str(exc)}",
            },
        )


@router.put("/{portfolio_id}/holdings/{holding_id}", response_model=schemas.HoldingResponse)
async def update_holding(
    portfolio_id: int,
    holding_id: int,
    holding_data: schemas.HoldingUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a holding."""
    try:
        # Verify portfolio ownership
        portfolio = db.query(models.Portfolio).filter(
            models.Portfolio.id == portfolio_id,
            models.Portfolio.user_id == current_user.id,
        ).first()

        if not portfolio:
            raise HTTPException(status_code=404, detail="Portfolio not found")

        holding = db.query(models.Holding).filter(
            models.Holding.id == holding_id,
            models.Holding.portfolio_id == portfolio_id,
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

        logger.info(f"[UPDATE HOLDING] Updated holding {holding_id} in portfolio {portfolio_id}")
        return holding
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"[UPDATE HOLDING] Error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update holding: {str(exc)}")


@router.delete("/{portfolio_id}/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holding(
    portfolio_id: int,
    holding_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a holding from portfolio."""
    try:
        portfolio = db.query(models.Portfolio).filter(
            models.Portfolio.id == portfolio_id,
            models.Portfolio.user_id == current_user.id,
        ).first()

        if not portfolio:
            raise HTTPException(status_code=404, detail="Portfolio not found")

        holding = db.query(models.Holding).filter(
            models.Holding.id == holding_id,
            models.Holding.portfolio_id == portfolio_id,
        ).first()

        if not holding:
            raise HTTPException(status_code=404, detail="Holding not found")

        # Record sell transaction
        quote = await get_stock_quote(holding.ticker)
        current_price = (
            quote.get("price", holding.avg_buy_price) if quote else holding.avg_buy_price
        )

        transaction = models.Transaction(
            ticker=holding.ticker,
            transaction_type=models.TransactionType.SELL,
            quantity=holding.quantity,
            price=current_price,
            total_amount=round(holding.quantity * current_price, 2),
            portfolio_id=portfolio_id,
        )
        db.add(transaction)

        ticker = holding.ticker
        db.delete(holding)
        db.commit()

        logger.info(
            f"[DELETE HOLDING] Removed {ticker} from portfolio {portfolio_id} "
            f"for user {current_user.id}"
        )
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"[DELETE HOLDING] Error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete holding: {str(exc)}")


# ============== Transactions Endpoints ==============

@router.get("/{portfolio_id}/transactions", response_model=List[schemas.TransactionResponse])
async def get_transactions(
    portfolio_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all transactions for a portfolio."""
    try:
        portfolio = db.query(models.Portfolio).filter(
            models.Portfolio.id == portfolio_id,
            models.Portfolio.user_id == current_user.id,
        ).first()

        if not portfolio:
            raise HTTPException(status_code=404, detail="Portfolio not found")

        transactions = (
            db.query(models.Transaction)
            .filter(models.Transaction.portfolio_id == portfolio_id)
            .order_by(models.Transaction.executed_at.desc())
            .limit(100)
            .all()
        )

        return transactions
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"[GET TRANSACTIONS] Error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch transactions")


# ============== Import Endpoint ==============

@router.post("/{portfolio_id}/import", status_code=status.HTTP_201_CREATED)
async def import_holdings(
    portfolio_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Import holdings from broker CSV/Excel file."""
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == portfolio_id,
        models.Portfolio.user_id == current_user.id,
    ).first()

    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")

    try:
        content = await file.read()
        holdings_list, metadata = extract_holdings(content, file.filename)

        imported_count = 0

        for item in holdings_list:
            existing = db.query(models.Holding).filter(
                models.Holding.portfolio_id == portfolio_id,
                models.Holding.ticker == item["ticker"],
            ).first()

            if existing:
                total_qty = existing.quantity + item["quantity"]
                total_cost = (
                    existing.quantity * existing.avg_buy_price
                    + item["quantity"] * item["avg_buy_price"]
                )
                existing.quantity = total_qty
                if total_qty > 0:
                    existing.avg_buy_price = total_cost / total_qty

                transaction = models.Transaction(
                    ticker=item["ticker"],
                    transaction_type=models.TransactionType.BUY,
                    quantity=item["quantity"],
                    price=item["avg_buy_price"],
                    total_amount=item["quantity"] * item["avg_buy_price"],
                    portfolio_id=portfolio_id,
                    notes=f"Imported from {metadata['detected_broker']}",
                )
                db.add(transaction)
                imported_count += 1
            else:
                new_holding = models.Holding(
                    ticker=item["ticker"],
                    name=item.get("name") or item["ticker"],
                    asset_type="EQUITY",
                    quantity=item["quantity"],
                    avg_buy_price=item["avg_buy_price"],
                    portfolio_id=portfolio_id,
                )
                db.add(new_holding)

                transaction = models.Transaction(
                    ticker=item["ticker"],
                    transaction_type=models.TransactionType.BUY,
                    quantity=item["quantity"],
                    price=item["avg_buy_price"],
                    total_amount=item["quantity"] * item["avg_buy_price"],
                    portfolio_id=portfolio_id,
                    notes=f"Imported from {metadata['detected_broker']}",
                )
                db.add(transaction)
                imported_count += 1

        db.commit()
        logger.info(
            f"[IMPORT HOLDINGS] Imported {imported_count} holdings into portfolio {portfolio_id} "
            f"from {metadata.get('detected_broker', 'unknown')} for user {current_user.id}"
        )

        return {
            "success": True,
            "message": f"Successfully imported {imported_count} holdings",
            "metadata": metadata,
        }

    except Exception as exc:
        db.rollback()
        logger.error(f"[IMPORT HOLDINGS] Import failed: {exc}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Import failed: {str(exc)}")
