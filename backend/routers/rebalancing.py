"""
OptiWealth — Rebalancing API Router
=====================================
REST endpoints for the 9-stage smart rebalancing pipeline.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
from services.rebalancing.models import (
    Position,
    PortfolioContext,
    RebalancingConfig,
    RebalancingReport,
    HarvestOpportunity,
)
from services.rebalancing.orchestrator import execute_smart_rebalancing_pipeline
from services.rebalancing.tax_engine import find_harvest_opportunities
from services.smallcase_service import create_order_transaction

from pydantic import BaseModel


router = APIRouter(
    prefix="/rebalancing",
    tags=["Smart Rebalancing"],
)


# ── Request Schemas ───────────────────────────────────────────────────

class RebalanceRequestPayload(BaseModel):
    """Payload for preview / run endpoints."""
    positions: List[Position]
    context: PortfolioContext
    config: RebalancingConfig = RebalancingConfig()


class ExecuteTradesPayload(BaseModel):
    """Payload for trade execution via Smallcase."""
    smallcase_auth_token: str
    trade_ids: Optional[List[int]] = None  # None = execute all


# ── Endpoints ─────────────────────────────────────────────────────────

@router.post("/{portfolio_id}/preview", response_model=RebalancingReport)
async def preview_rebalancing(
    portfolio_id: str,
    req: RebalanceRequestPayload,
    db: Session = Depends(get_db),
):
    """Dry-run the smart rebalancing engine without persisting.

    Returns the full RebalancingReport with trades, alerts, and AI summary
    but does NOT save to DB or execute any trades.
    """
    try:
        report = await execute_smart_rebalancing_pipeline(
            portfolio_id=portfolio_id,
            db=db,
            triggered_by="api_preview",
            positions_mock=req.positions,
            context_mock=req.context,
            config_mock=req.config,
            dry_run=True,
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rebalancing preview failed: {str(e)}")


@router.post("/{portfolio_id}/run", response_model=RebalancingReport)
async def run_rebalancing(
    portfolio_id: str,
    req: RebalanceRequestPayload,
    db: Session = Depends(get_db),
):
    """Run the full rebalancing engine and persist the report.

    Executes all 9 stages and saves the result to rebalancing_log.
    """
    try:
        report = await execute_smart_rebalancing_pipeline(
            portfolio_id=portfolio_id,
            db=db,
            triggered_by="manual",
            positions_mock=req.positions,
            context_mock=req.context,
            config_mock=req.config,
            dry_run=False,
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rebalancing run failed: {str(e)}")


@router.post("/{portfolio_id}/run-auto", response_model=RebalancingReport)
async def run_auto_rebalancing(
    portfolio_id: str,
    db: Session = Depends(get_db),
):
    """Run rebalancing using DB-loaded portfolio data (no mock positions).

    Automatically loads holdings from the portfolio and runs the full pipeline.
    """
    try:
        report = await execute_smart_rebalancing_pipeline(
            portfolio_id=portfolio_id,
            db=db,
            triggered_by="scheduled",
            dry_run=False,
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto rebalancing failed: {str(e)}")


@router.post("/{portfolio_id}/execute")
async def execute_trades(
    portfolio_id: str,
    req: ExecuteTradesPayload,
    db: Session = Depends(get_db),
):
    """Execute approved trades via Smallcase Gateway.

    1. Fetches the latest pending rebalancing report.
    2. Filters trades by trade_ids (or all if None).
    3. Submits the basket order via Smallcase API.
    """
    try:
        # First run the pipeline to get fresh trades
        report = await execute_smart_rebalancing_pipeline(
            portfolio_id=portfolio_id,
            db=db,
            triggered_by="execution",
            dry_run=True,
        )

        if not report.trades:
            return {"status": "no_trades", "message": "No actionable trades found."}

        # Filter if specific trade IDs requested
        trades_to_execute = report.trades
        if req.trade_ids:
            trades_to_execute = [
                t for i, t in enumerate(report.trades)
                if i in req.trade_ids
            ]

        # Build order payload from smallcase_order_config
        order_items = [
            {
                "symbol": t.smallcase_order_config.get("symbol", t.symbol),
                "action": t.action,
                "quantity": t.quantity,
                "exchange": t.smallcase_order_config.get("exchange", "NSE"),
            }
            for t in trades_to_execute
            if t.quantity > 0
        ]

        if not order_items:
            return {"status": "no_executable_trades", "message": "All trades have zero quantity."}

        # Submit to Smallcase
        result = await create_order_transaction(
            req.smallcase_auth_token, order_items
        )

        return {
            "status": "submitted",
            "transaction_id": result.get("transactionId", ""),
            "orders_count": len(order_items),
            "total_sell_value": sum(t.estimated_value for t in trades_to_execute if t.action == "SELL"),
            "total_buy_value": sum(t.estimated_value for t in trades_to_execute if t.action == "BUY"),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trade execution failed: {str(e)}")


@router.get("/{portfolio_id}/harvest", response_model=List[HarvestOpportunity])
async def get_harvest_opportunities(
    portfolio_id: str,
    db: Session = Depends(get_db),
):
    """Find tax-loss harvest opportunities for the portfolio."""
    try:
        report = await execute_smart_rebalancing_pipeline(
            portfolio_id=portfolio_id,
            db=db,
            triggered_by="harvest_scan",
            dry_run=True,
        )
        return report.harvest_opportunities
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{portfolio_id}/history")
async def get_rebalance_history(
    portfolio_id: str,
    db: Session = Depends(get_db),
):
    """Fetch past rebalancing logs for a portfolio."""
    try:
        from sqlalchemy import text
        rows = db.execute(
            text("""
                SELECT id, triggered_by, total_drift_score, trades_count,
                       estimated_tax, ai_summary, created_at
                FROM rebalancing_log
                WHERE portfolio_id = :pid
                ORDER BY created_at DESC
                LIMIT 20
            """),
            {"pid": portfolio_id},
        ).fetchall()

        return {
            "portfolio_id": portfolio_id,
            "logs": [
                {
                    "id": row[0],
                    "triggered_by": row[1],
                    "total_drift_score": row[2],
                    "trades_count": row[3],
                    "estimated_tax": row[4],
                    "ai_summary": row[5],
                    "created_at": row[6],
                }
                for row in rows
            ] if rows else [],
        }
    except Exception:
        return {
            "portfolio_id": portfolio_id,
            "logs": [],
            "note": "Rebalancing history table not yet initialized.",
        }


@router.get("/config")
async def get_config():
    """Return default rebalancing configuration."""
    return RebalancingConfig()


@router.put("/config")
async def update_config(cfg: RebalancingConfig):
    """Update rebalancing configuration (in-memory only for prototype)."""
    return {"status": "success", "config": cfg}
