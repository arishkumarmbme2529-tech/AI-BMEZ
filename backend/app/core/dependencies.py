"""Core dependencies."""
from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import get_current_active_user

__all__ = ["get_db", "get_current_active_user"]
