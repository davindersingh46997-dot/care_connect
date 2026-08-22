from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User, RoleEnum
from backend.app.models.patient import Patient
from backend.app.models.doctor import Doctor
from backend.app.schemas.auth import UserRegisterRequest, UserLoginRequest, TokenResponse
from backend.app.services.auth_service import hash_password, verify_password, create_access_token
from backend.app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_patient(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email address already exists.")

    user = User(
        name=payload.name.strip(),
        email=email_clean,
        password_hash=hash_password(payload.password),
        role=RoleEnum.PATIENT,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    patient = Patient(
        user_id=user.id,
        age=payload.age,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    db.add(patient)
    db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "age": patient.age,
            "latitude": patient.latitude,
            "longitude": patient.longitude,
        },
    }

@router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLoginRequest, db: Session = Depends(get_db)):
    email_clean = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    patient_profile = db.query(Patient).filter(Patient.user_id == user.id).first() if user.role == RoleEnum.PATIENT else None
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
            "age": patient_profile.age if patient_profile else None,
            "latitude": patient_profile.latitude if patient_profile else None,
            "longitude": patient_profile.longitude if patient_profile else None,
        },
    }

@router.get("/me")
def get_current_user_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    resp = {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.value,
    }

    if current_user.role == RoleEnum.PATIENT:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if patient:
            resp["age"] = patient.age
            resp["latitude"] = patient.latitude
            resp["longitude"] = patient.longitude
    elif current_user.role == RoleEnum.DOCTOR:
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
                "clinic_status": doctor.clinic_status.value,
            }

    return resp

@router.post("/logout")
def logout_user():
    return {"message": "Logged out successfully."}
