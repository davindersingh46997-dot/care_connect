from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User, RoleEnum
from backend.app.utils.dependencies import require_role

router = APIRouter(prefix="/api/patients", tags=["Patients"])

class PatientUpdateRequest(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    location: Optional[str] = None

@router.get("/me")
def get_patient_profile(
    current_user: User = Depends(require_role(RoleEnum.PATIENT)),
    db: Session = Depends(get_db)
):
    """Retrieve authenticated patient's account details."""
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
        "age": current_user.age,
        "phone": current_user.phone,
        "location": current_user.location,
        "created_at": current_user.created_at.strftime("%Y-%m-%d")
    }

@router.patch("/me")
def update_patient_profile(
    payload: PatientUpdateRequest,
    current_user: User = Depends(require_role(RoleEnum.PATIENT)),
    db: Session = Depends(get_db)
):
    """Update patient personal information."""
    if payload.name:
        current_user.name = payload.name.strip()
    if payload.age is not None:
        current_user.age = payload.age
    if payload.phone:
        current_user.phone = payload.phone.strip()
    if payload.location:
        current_user.location = payload.location.strip()

    db.commit()
    db.refresh(current_user)
    return {"message": "Profile updated successfully."}
