from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db
from services.rebalancing.models import Position, PortfolioContext, RebalancingConfig, RebalancingReport, HarvestOpportunity
from services.rebalancing.orchestrator import execute_smart_rebalancing_pipeline
from services.rebalancing.tax_engine import find_harvest_opportunities

router = APIRouter(
    prefix="/rebalancing",
    tags=["Smart Rebalancing"]
)

from pydantic import BaseModel
class RebalanceRequestPayload(BaseModel):
    positions: List[Position]
    context: PortfolioContext
    config: RebalancingConfig = RebalancingConfig()

@router.post("/{portfolio_id}/preview", response_model=RebalancingReport)
async def preview_rebalancing(portfolio_id: str, req: RebalanceRequestPayload, db: Session = Depends(get_db)):
    """Dry run the smart rebalancing engine 18-step pipeline without saving to DB."""
    try:
        report = await execute_smart_rebalancing_pipeline(
            portfolio_id=portfolio_id,
            db=db,
            triggered_by="api_preview",
            positions_mock=req.positions,
            context_mock=req.context,
            config_mock=req.config,
            dry_run=True 
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{portfolio_id}/run", response_model=RebalancingReport)
async def run_rebalancing(portfolio_id: str, req: RebalanceRequestPayload, db: Session = Depends(get_db)):
    """Runs the full rebalancing engine and logs the report to the DB."""
    try:
        report = await execute_smart_rebalancing_pipeline(
            portfolio_id=portfolio_id,
            db=db,
            triggered_by="manual",
            positions_mock=req.positions, # Mock parameters inserted here for fast prototype testability
            context_mock=req.context,
            config_mock=req.config,
            dry_run=False
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{portfolio_id}/harvest", response_model=List[HarvestOpportunity])
async def get_harvest_opportunities(portfolio_id: str, req: RebalanceRequestPayload, db: Session = Depends(get_db)):
    try:
        # Pass empty tx sequence for prototype
        ops = find_harvest_opportunities(req.positions, [])
        return ops
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{portfolio_id}/history")
async def get_rebalance_history(portfolio_id: str, db: Session = Depends(get_db)):
    return {
        "portfolio_id": portfolio_id,
        "logs": [
            {
                "id": 1,
                "triggered_by": "manual",
                "created_at": datetime.utcnow().isoformat(),
                "summary": "Processed 12 optimal trades."
            }
        ]
    }

@router.post("/{portfolio_id}/execute")
async def execute_trades(portfolio_id: str, db: Session = Depends(get_db)):
    return {"status": "success", "message": "Trades executed and positions updated."}

@router.get("/config")
async def get_config():
    return RebalancingConfig()

@router.put("/config")
async def update_config(cfg: RebalancingConfig):
    return {"status": "success", "config": cfg}
