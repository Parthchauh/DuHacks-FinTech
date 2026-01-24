"""
Session Management Router - Active Session Control
===================================================
Endpoints for viewing and managing user login sessions.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
import models
from services.auth_service import get_current_user
from datetime import datetime
import hashlib
from user_agents import parse as parse_user_agent

router = APIRouter(prefix="/api/user/sessions", tags=["Sessions"])


def get_device_name(user_agent_string: str) -> str:
    """Parse user agent to get a friendly device name"""
    try:
        ua = parse_user_agent(user_agent_string)
        browser = ua.browser.family
        os = ua.os.family
        device = ua.device.family
        
        if device and device != "Other":
            return f"{device} - {browser}"
        return f"{os} - {browser}"
    except Exception:
        return "Unknown Device"


@router.get("/")
async def list_sessions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all active sessions for the current user"""
    sessions = db.query(models.UserSession).filter(
        models.UserSession.user_id == current_user.id,
        models.UserSession.revoked == False
    ).order_by(models.UserSession.last_active.desc()).all()
    
    result = []
    for s in sessions:
        result.append({
            "id": s.id,
            "device_name": s.device_name or "Unknown Device",
            "ip_address": s.ip_address,
            "location": s.location or "Unknown Location",
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "last_active": s.last_active.isoformat() if s.last_active else None,
            "is_current": s.is_current
        })
    
    return {"sessions": result}


@router.delete("/{session_id}")
async def revoke_session(
    session_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke a specific session (logout that device)"""
    session = db.query(models.UserSession).filter(
        models.UserSession.id == session_id,
        models.UserSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.is_current:
        raise HTTPException(status_code=400, detail="Cannot revoke current session")
    
    session.revoked = True
    db.commit()
    
    return {"message": "Session revoked successfully"}


@router.delete("/")
async def revoke_all_sessions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke all sessions except current (logout everywhere else)"""
    db.query(models.UserSession).filter(
        models.UserSession.user_id == current_user.id,
        models.UserSession.is_current == False,
        models.UserSession.revoked == False
    ).update({"revoked": True})
    
    db.commit()
    
    return {"message": "All other sessions revoked successfully"}


def create_session(
    db: Session,
    user_id: int,
    token: str,
    request: Request,
    is_current: bool = False
) -> models.UserSession:
    """
    Create a new session record when user logs in.
    Call this from the login endpoint.
    """
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Get client info
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    device_name = get_device_name(user_agent)
    
    session = models.UserSession(
        user_id=user_id,
        token_hash=token_hash,
        ip_address=ip_address,
        user_agent=user_agent,
        device_name=device_name,
        is_current=is_current
    )
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return session


def update_session_activity(db: Session, token: str):
    """Update last_active timestamp for a session"""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    session = db.query(models.UserSession).filter(
        models.UserSession.token_hash == token_hash
    ).first()
    
    if session:
        session.last_active = datetime.utcnow()
        db.commit()


def check_session_valid(db: Session, token: str) -> bool:
    """Check if a session is still valid (not revoked)"""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    session = db.query(models.UserSession).filter(
        models.UserSession.token_hash == token_hash,
        models.UserSession.revoked == False
    ).first()
    
    return session is not None
