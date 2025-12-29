from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import crud, models, schemas
from ..dependencies import get_db
from ..auth import get_current_active_user

router = APIRouter()

@router.get("/activity-logs/", response_model=List[schemas.ActivityLog])
def read_activity_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view activity logs")
    return crud.get_activity_logs(db, skip=skip, limit=limit)
