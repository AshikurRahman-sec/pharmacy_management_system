from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from .. import crud, models, schemas
from ..dependencies import get_db
from ..auth import get_current_active_user

router = APIRouter()

# ... create_shareholder ...

@router.get("/shareholders/", response_model=schemas.PaginatedResponse[schemas.Shareholder])
def read_shareholders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    data = crud.get_shareholders(db, skip=skip, limit=limit)
    shareholders = data["items"]
    
    # Calculate total system investment
    total_system_inv = db.query(func.sum(models.Investment.amount)).scalar() or 1
    
    # Calculate totals dynamically
    for sh in shareholders:
        total_inv = sum(inv.amount for inv in sh.investments)
        sh.total_investment = total_inv
        sh.share_percentage = (total_inv / total_system_inv) * 100
    
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (data["total"] + limit - 1) // limit if limit > 0 else 1
    return {
        "items": shareholders,
        "total": data["total"],
        "page": page,
        "size": limit,
        "pages": total_pages
    }

@router.post("/profit-distributions/", response_model=schemas.ProfitDistribution)
def distribute_profit(
    distribution: schemas.ProfitDistributionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Superadmin can distribute profits")
    return crud.create_profit_distribution(db=db, distribution=distribution, user_id=current_user.id)

@router.get("/profit-distributions/", response_model=schemas.PaginatedResponse[schemas.ProfitDistribution])
def read_profit_distributions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    data = crud.get_profit_distributions(db, skip=skip, limit=limit)
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (data["total"] + limit - 1) // limit if limit > 0 else 1
    return {
        "items": data["items"],
        "total": data["total"],
        "page": page,
        "size": limit,
        "pages": total_pages
    }
