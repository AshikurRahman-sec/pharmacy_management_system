from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import crud, models, schemas
from ..dependencies import get_db
from ..auth import get_current_active_user

router = APIRouter()

@router.post("/shareholders/", response_model=schemas.Shareholder)
def create_shareholder(
    shareholder: schemas.ShareholderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return crud.create_shareholder(db=db, shareholder=shareholder)

@router.get("/shareholders/", response_model=List[schemas.Shareholder])
def read_shareholders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    shareholders = crud.get_shareholders(db, skip=skip, limit=limit)
    
    # Calculate totals dynamically
    for sh in shareholders:
        total_inv = sum(inv.amount for inv in sh.investments)
        sh.total_investment = total_inv
        # Share percentage calculation would require total system investment
        # We can calculate that here or in a separate stats endpoint
    
    return shareholders

@router.post("/profit-distributions/", response_model=schemas.ProfitDistribution)
def distribute_profit(
    distribution: schemas.ProfitDistributionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Superadmin can distribute profits")
    return crud.create_profit_distribution(db=db, distribution=distribution, user_id=current_user.id)

@router.get("/profit-distributions/", response_model=List[schemas.ProfitDistribution])
def read_profit_distributions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    return crud.get_profit_distributions(db, skip=skip, limit=limit)
