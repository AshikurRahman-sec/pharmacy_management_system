from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import crud, models, schemas
from ..dependencies import get_db
from ..auth import get_current_active_user

router = APIRouter()

@router.get("/activity-logs/", response_model=schemas.PaginatedResponse[schemas.ActivityLog])
def read_activity_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view activity logs")
    data = crud.get_activity_logs(db, skip=skip, limit=limit)
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (data["total"] + limit - 1) // limit if limit > 0 else 1
    return {
        "items": data["items"],
        "total": data["total"],
        "page": page,
        "size": limit,
        "pages": total_pages
    }
