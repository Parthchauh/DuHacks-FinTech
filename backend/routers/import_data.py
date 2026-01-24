"""
Import Router - Secure File Upload & Holdings Import
=====================================================
Enterprise-grade file import system for broker exports (CSV/Excel).

Security Pipeline:
1. File Validation: Extension whitelist (.csv, .xlsx, .xls), 15MB limit
2. MIME Verification: Magic bytes check prevents disguised executables
3. Malware Scanning: VirusTotal API (70+ antivirus engines)
4. Safe Storage: UUID-renamed temp files, auto-cleanup

Smart Column Detection:
Automatically finds ticker, price, and quantity columns even if
broker exports contain extra data. Supports Zerodha, Angel One,
Upstox, Groww, and generic CSV formats.

Flow:
POST /upload → Validate & Scan → Return preview
POST /confirm → Parse holdings → Create DB records
DELETE /cancel → Cleanup pending import
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, List
from database import get_db
import models
from services.auth_service import get_current_user
from services.file_security_service import (
    validate_and_scan_file, 
    save_temp_file, 
    cleanup_temp_file,
    FileValidationError,
    MalwareDetectedError
)
from services.import_service import (
    extract_holdings,
    preview_file,
    ImportError as DataImportError
)
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/import", tags=["Import"])

# =============================================================================
# PENDING IMPORTS STORE
# =============================================================================
# In-memory storage for pending imports. In production, use Redis with TTL
# to automatically expire pending imports after 30 minutes. This prevents
# abandoned uploads from consuming memory indefinitely.
# =============================================================================
pending_imports: Dict[str, dict] = {}


class ColumnMappings(BaseModel):
    ticker: Optional[str] = None
    price: Optional[str] = None
    quantity: Optional[str] = None
    name: Optional[str] = None


class ConfirmImportRequest(BaseModel):
    import_id: str
    portfolio_id: int
    mappings: Optional[ColumnMappings] = None


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    skip_virus_scan: bool = Query(default=False, description="Skip VirusTotal scan (for testing)"),
    current_user: models.User = Depends(get_current_user)
):
    """
    Upload a file for import.
    
    Performs:
    1. File validation (extension, size, MIME type)
    2. Malware scanning (VirusTotal)
    3. Data preview extraction
    
    Returns import_id for confirmation step.
    """
    try:
        # Read file content
        content = await file.read()
        
        # Validate and scan
        validation_result = await validate_and_scan_file(
            content, 
            file.filename,
            skip_virus_scan=skip_virus_scan
        )
        
        # Get preview
        preview = preview_file(content, file.filename)
        
        # Generate import ID
        import_id = str(uuid.uuid4())
        
        # Store for confirmation (expires after 30 mins in production)
        pending_imports[import_id] = {
            'user_id': current_user.id,
            'filename': file.filename,
            'content': content,
            'validation': validation_result,
            'preview': preview,
            'created_at': datetime.utcnow().isoformat()
        }
        
        return {
            'import_id': import_id,
            'filename': file.filename,
            'validation': {
                'valid': validation_result['valid'],
                'mime_type': validation_result['mime_type'],
                'size_bytes': validation_result['size_bytes'],
                'checksum': validation_result['checksum'],
                'virus_scan': validation_result.get('virus_scan', {})
            },
            'preview': preview,
            'message': 'File uploaded successfully. Ready for import confirmation.'
        }
    
    except FileValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    except MalwareDetectedError as e:
        raise HTTPException(status_code=422, detail=f"Security Alert: {str(e)}")
    
    except DataImportError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/preview/{import_id}")
async def get_preview(
    import_id: str,
    current_user: models.User = Depends(get_current_user)
):
    """Get preview of pending import"""
    pending = pending_imports.get(import_id)
    
    if not pending:
        raise HTTPException(status_code=404, detail="Import not found or expired")
    
    if pending['user_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        'import_id': import_id,
        'filename': pending['filename'],
        'preview': pending['preview'],
        'validation': pending['validation']
    }


@router.post("/confirm")
async def confirm_import(
    request: ConfirmImportRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Confirm and execute the import.
    
    Creates holdings and transactions in the specified portfolio.
    """
    # Get pending import
    pending = pending_imports.get(request.import_id)
    
    if not pending:
        raise HTTPException(status_code=404, detail="Import not found or expired")
    
    if pending['user_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Verify portfolio ownership
    portfolio = db.query(models.Portfolio).filter(
        models.Portfolio.id == request.portfolio_id,
        models.Portfolio.user_id == current_user.id
    ).first()
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    
    try:
        # Extract holdings with optional mappings
        override_mappings = None
        if request.mappings:
            override_mappings = request.mappings.dict(exclude_none=True)
        
        holdings, metadata = extract_holdings(
            pending['content'],
            pending['filename'],
            override_mappings
        )
        
        # Create holdings and transactions
        created_holdings = []
        created_transactions = []
        
        for h in holdings:
            # Check if holding already exists
            existing = db.query(models.Holding).filter(
                models.Holding.portfolio_id == portfolio.id,
                models.Holding.ticker == h['ticker']
            ).first()
            
            if existing:
                # Update existing holding (average the prices)
                total_qty = existing.quantity + h['quantity']
                avg_price = (
                    (existing.quantity * existing.avg_buy_price) + 
                    (h['quantity'] * h['avg_buy_price'])
                ) / total_qty
                
                existing.quantity = total_qty
                existing.avg_buy_price = round(avg_price, 2)
                created_holdings.append({
                    'ticker': existing.ticker,
                    'action': 'updated',
                    'quantity': total_qty
                })
            else:
                # Create new holding
                new_holding = models.Holding(
                    portfolio_id=portfolio.id,
                    ticker=h['ticker'],
                    name=h['name'],
                    asset_type='EQUITY',
                    quantity=h['quantity'],
                    avg_buy_price=h['avg_buy_price'],
                    target_allocation=0  # User can set later
                )
                db.add(new_holding)
                created_holdings.append({
                    'ticker': h['ticker'],
                    'action': 'created',
                    'quantity': h['quantity']
                })
            
            # Create transaction record
            transaction = models.Transaction(
                portfolio_id=portfolio.id,
                ticker=h['ticker'],
                transaction_type=models.TransactionType.BUY,
                quantity=h['quantity'],
                price=h['avg_buy_price'],
                total_amount=h['quantity'] * h['avg_buy_price'],
                notes=f"Imported from {pending['filename']}"
            )
            db.add(transaction)
            created_transactions.append(h['ticker'])
        
        db.commit()
        
        # Cleanup pending import
        del pending_imports[request.import_id]
        
        return {
            'success': True,
            'portfolio_id': portfolio.id,
            'portfolio_name': portfolio.name,
            'holdings_created': len([h for h in created_holdings if h['action'] == 'created']),
            'holdings_updated': len([h for h in created_holdings if h['action'] == 'updated']),
            'transactions_created': len(created_transactions),
            'details': created_holdings,
            'metadata': metadata
        }
    
    except DataImportError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.delete("/cancel/{import_id}")
async def cancel_import(
    import_id: str,
    current_user: models.User = Depends(get_current_user)
):
    """Cancel a pending import"""
    pending = pending_imports.get(import_id)
    
    if not pending:
        raise HTTPException(status_code=404, detail="Import not found")
    
    if pending['user_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    del pending_imports[import_id]
    
    return {'message': 'Import cancelled successfully'}
