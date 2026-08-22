from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db, ensure_database_schema
from backend.app.models.user import User, RoleEnum
from backend.app.models.doctor import Doctor, ClinicStatusEnum
from backend.app.models.review import Review
from backend.app.schemas.doctor import DoctorRegisterRequest, DoctorUpdateRequest, DoctorAvailabilityRequest
from backend.app.services.auth_service import hash_password, create_access_token
from backend.app.services.ranking_service import rank_available_doctors, get_doctor_real_metrics
from backend.app.utils.dependencies import get_current_user, get_optional_user, require_role

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_doctor(payload: DoctorRegisterRequest, db: Session = Depends(get_db)):
    ensure_database_schema()
    email_clean = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email address already exists.")

    if not payload.name.strip() or not payload.specialty.strip() or not payload.qualification.strip() or not payload.clinic_name.strip() or not payload.clinic_address.strip():
        raise HTTPException(status_code=400, detail="All required doctor fields are required.")

    if payload.experience < 0:
        raise HTTPException(status_code=400, detail="Experience must be a non-negative number.")

    if payload.consultation_fee < 0:
        raise HTTPException(status_code=400, detail="Consultation fee must be greater than or equal to zero.")

    user = User(
        name=payload.name.strip(),
        email=email_clean,
        password_hash=hash_password(payload.password),
        role=RoleEnum.DOCTOR,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    doctor = Doctor(
        user_id=user.id,
        specialty=payload.specialty.strip(),
        qualification=payload.qualification.strip(),
        experience_years=payload.experience,
        consultation_fee=payload.consultation_fee,
        clinic_name=payload.clinic_name.strip(),
        clinic_address=payload.clinic_address.strip(),
        latitude=payload.latitude,
        longitude=payload.longitude,
        phone=payload.phone.strip() if payload.phone else None,
        professional_registration_number=payload.professional_registration_number.strip() if payload.professional_registration_number else None,
        profile_description=payload.profile_description.strip() if payload.profile_description else None,
        working_hours=payload.working_hours.strip() if payload.working_hours else "09:00 AM - 06:00 PM",
        clinic_status=ClinicStatusEnum.CLOSED,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {
        "message": "Doctor account created successfully.",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value,
        },
        "doctor": {
            "id": doctor.id,
            "specialty": doctor.specialty,
            "clinic_status": doctor.clinic_status.value,
        }
    }

@router.get("/search")
def search_doctors(
    specialty: str = Query(None),
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    priority: str = Query("best_match"),
    maxFee: float | None = Query(None),
    maxDistance: float | None = Query(None),
    onlyOpen: bool = Query(False),
    minRating: float | None = Query(None),
    db: Session = Depends(get_db)
):
    ensure_database_schema()
    results = rank_available_doctors(
        db=db,
        specialty=specialty or "",
        user_lat=lat,
        user_lng=lng,
        priority=priority,
        max_fee=maxFee,
        max_distance=maxDistance,
        only_open=onlyOpen,
        min_rating=minRating,
    )
    return {"count": len(results), "specialty": specialty or "All Specialties", "priority": priority, "doctors": results}

@router.get("/")
def get_all_available_doctors(db: Session = Depends(get_db)):
    results = rank_available_doctors(db=db, specialty="")
    return {"doctors": results}

@router.get("/{doctor_id}")
def get_doctor_by_id(doctor_id: int, db: Session = Depends(get_db), optional_user: User | None = Depends(get_optional_user)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    is_owner = optional_user and optional_user.id == doctor.user_id
    if not is_owner and doctor.user and doctor.user.role != RoleEnum.DOCTOR:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    metrics = get_doctor_real_metrics(db, doctor, None, None)
    reviews = db.query(Review).filter(Review.doctor_id == doctor.id).order_by(Review.created_at.desc()).all()

    return {
        "id": doctor.id,
        "name": doctor.user.name if doctor.user else None,
        "specialty": doctor.specialty,
        "qualification": doctor.qualification,
        "experience": doctor.experience,
        "fee": doctor.fee,
        "clinic_name": doctor.clinic_name,
        "address": doctor.address,
        "latitude": doctor.latitude,
        "longitude": doctor.longitude,
        "working_hours": doctor.working_hours,
        "clinic_status": doctor.clinic_status.value,
        "waiting_count": metrics["waiting_count"],
        "current_token": metrics["current_token"],
        "estimated_wait_mins": metrics["estimated_wait_mins"],
        "rating": metrics["rating"],
        "reviews_count": len(reviews),
        "reviews": [{"id": r.id, "patient_name": r.patient_name, "rating": r.rating, "comment": r.comment, "created_at": r.created_at.strftime("%Y-%m-%d")} for r in reviews],
    }

@router.patch("/{doctor_id}")
def update_doctor_profile(doctor_id: int, payload: DoctorUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    if doctor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this profile.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            if field == "consultation_fee":
                field = "consultation_fee"
            if field == "clinic_address":
                field = "clinic_address"
            if field == "profile_description":
                field = "profile_description"
            setattr(doctor, field, val)

    db.commit()
    db.refresh(doctor)
    return {"message": "Doctor profile updated successfully.", "doctor_id": doctor.id}

@router.patch("/{doctor_id}/status")
def update_clinic_status(doctor_id: int, payload: DoctorAvailabilityRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")
    if doctor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to modify clinic status.")

    status_upper = payload.clinic_status.upper().strip()
    if status_upper not in [s.value for s in ClinicStatusEnum]:
        raise HTTPException(status_code=400, detail="Invalid clinic status. Allowed: OPEN, PAUSED, CLOSED.")

    doctor.clinic_status = ClinicStatusEnum(status_upper)
    db.commit()
    db.refresh(doctor)
    return {"message": f"Clinic status updated to {doctor.clinic_status.value}.", "clinic_status": doctor.clinic_status.value}
