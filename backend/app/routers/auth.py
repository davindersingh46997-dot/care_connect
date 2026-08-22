from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User, RoleEnum
from backend.app.models.doctor import Doctor, AccountStatusEnum
from backend.app.schemas.auth import UserRegisterRequest, UserLoginRequest, TokenResponse, UserResponse
from backend.app.services.auth_service import hash_password, verify_password, create_access_token
from backend.app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_patient(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new patient user. Role is strictly PATIENT."""
    email_clean = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    new_user = User(
        name=payload.name.strip(),
        email=email_clean,
        password_hash=hash_password(payload.password),
        role=RoleEnum.PATIENT,
        age=payload.age,
        phone=payload.phone.strip() if payload.phone else None,
        location=payload.location.strip() if payload.location else None
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token({"sub": str(new_user.id), "role": new_user.role.value})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "role": new_user.role.value,
            "age": new_user.age,
            "phone": new_user.phone,
            "location": new_user.location
        }
    }

@router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate a patient, doctor, or admin using real password verification."""
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "age": user.age,
            "phone": user.phone,
            "location": user.location
        }
    }

@router.get("/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return authenticated user profile and doctor account status if applicable."""
    resp = {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
        "age": current_user.age,
        "phone": current_user.phone,
        "location": current_user.location
    }

    if current_user.role == RoleEnum.DOCTOR:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if doctor:
            resp["doctor"] = {
                "id": doctor.id,
                "specialty": doctor.specialty,
                "qualification": doctor.qualification,
                "experience": doctor.experience,
                "fee": doctor.fee,
                "clinic_name": doctor.clinic_name,
                "address": doctor.address,
                "account_status": doctor.account_status.value,
                "clinic_status": doctor.clinic_status.value
            }

    return resp

@router.post("/logout")
def logout_user():
    return {"message": "Logged out successfully."}
