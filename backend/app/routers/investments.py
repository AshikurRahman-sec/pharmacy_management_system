from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas, models
from ..dependencies import get_db
from ..auth import get_current_active_user

router = APIRouter()

@router.post("/investments/", response_model=schemas.Investment)
def create_investment(
    investment: schemas.InvestmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    if current_user.role not in ["superadmin", "admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return crud.create_investment(db=db, investment=investment, user_id=current_user.id)

@router.get("/investments/", response_model=List[schemas.Investment])
def read_investments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    investments = crud.get_investments(db, skip=skip, limit=limit)
    return investments
