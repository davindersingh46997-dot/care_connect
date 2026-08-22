from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User, RoleEnum
from backend.app.models.doctor import Doctor, AccountStatusEnum, ClinicStatusEnum
from backend.app.models.review import Review
from backend.app.schemas.doctor import DoctorRegisterRequest, DoctorUpdateRequest, DoctorAvailabilityRequest
from backend.app.services.auth_service import hash_password, create_access_token
from backend.app.services.ranking_service import rank_approved_doctors, get_doctor_real_metrics, DEFAULT_USER_LATITUDE, DEFAULT_USER_LONGITUDE
from backend.app.utils.dependencies import get_current_user, get_optional_user, require_role

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_doctor(payload: DoctorRegisterRequest, db: Session = Depends(get_db)):
    """Register a new healthcare provider. The account will be PENDING administrator approval."""
    email_clean = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # 1. Create User
    new_user = User(
        name=payload.name.strip(),
        email=email_clean,
        password_hash=hash_password(payload.password),
        role=RoleEnum.DOCTOR,
        location=payload.address.strip()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 2. Create Doctor Profile with PENDING status
    new_doc = Doctor(
        user_id=new_user.id,
        specialty=payload.specialty.strip(),
        qualification=payload.qualification.strip(),
        experience=payload.experience,
        fee=payload.fee,
        clinic_name=payload.clinic_name.strip(),
        address=payload.address.strip(),
        latitude=payload.latitude,
        longitude=payload.longitude,
        license_number=payload.license_number.strip() if payload.license_number else None,
        working_hours=payload.working_hours.strip() if payload.working_hours else "09:00 AM - 06:00 PM",
        avg_consult_duration_mins=payload.avg_consult_duration_mins or 10,
        bio=payload.bio.strip() if payload.bio else None,
        account_status=AccountStatusEnum.PENDING,
        clinic_status=ClinicStatusEnum.CLOSED
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    token = create_access_token({"sub": str(new_user.id), "role": new_user.role.value})
    return {
        "message": "Your doctor registration has been submitted successfully. Your account is currently awaiting administrator review and approval.",
        "access_token": token,
        "token_type": "bearer",
        "account_status": "PENDING"
    }

@router.get("/search")
def search_doctors(
    specialty: str = Query(None),
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    priority: str = Query("best_match"),
    maxFee: float = Query(None),
    maxDistance: float = Query(None),
    onlyOpen: bool = Query(False),
    minRating: float = Query(None),
    current_user: User = Depends(require_role(RoleEnum.PATIENT)),
    db: Session = Depends(get_db)
):
    """Search and smart-rank ONLY approved registered doctors in the database."""
    results = rank_approved_doctors(
        db=db,
        specialty=specialty or "",
        user_lat=lat,
        user_lng=lng,
        priority=priority,
        max_fee=maxFee,
        max_distance=maxDistance,
        only_open=onlyOpen,
        min_rating=minRating
    )
    return {
        "count": len(results),
        "specialty": specialty or "All Specialties",
        "priority": priority,
        "doctors": results
    }

@router.get("/")
def get_all_approved_doctors(
    specialty: str = Query(None),
    current_user: User = Depends(require_role(RoleEnum.PATIENT)),
    db: Session = Depends(get_db)
):
    """Get all registered and approved doctors."""
    results = rank_approved_doctors(db=db, specialty=specialty or "")
    return {"doctors": results}

@router.get("/{doctor_id}")
def get_doctor_by_id(
    doctor_id: int,
    db: Session = Depends(get_db),
    optional_user: User | None = Depends(get_optional_user)
):
    """Get full profile details for a doctor."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    # Only allow viewing if APPROVED, or if requester is the doctor themselves or ADMIN
    is_owner = optional_user and (optional_user.id == doctor.user_id or optional_user.role == RoleEnum.ADMIN)
    if doctor.account_status != AccountStatusEnum.APPROVED and not is_owner:
        raise HTTPException(status_code=404, detail="Doctor profile is not publicly listed or is awaiting approval.")

    metrics = get_doctor_real_metrics(db, doctor, None, None)
    reviews = db.query(Review).filter(Review.doctor_id == doctor.id).order_by(Review.created_at.desc()).all()

    return {
        "id": doctor.id,
        "user_id": doctor.user_id,
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
        "avg_consult_duration_mins": doctor.avg_consult_duration_mins,
        "bio": doctor.bio,
        "account_status": doctor.account_status.value,
        "clinic_status": doctor.clinic_status.value,
        "distance_km": metrics["distance_km"],
        "waiting_count": metrics["waiting_count"],
        "current_token": metrics["current_token"],
        "estimated_wait_mins": metrics["estimated_wait_mins"],
        "rating": metrics["rating"],
        "reviews_count": len(reviews),
        "is_open": metrics["is_open"],
        "reviews": [
            {
                "id": r.id,
                "patient_name": r.patient_name,
                "rating": r.rating,
                "comment": r.comment,
                "created_at": r.created_at.strftime("%Y-%m-%d")
            } for r in reviews
        ]
    }

@router.patch("/{doctor_id}")
def update_doctor_profile(
    doctor_id: int,
    payload: DoctorUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Doctor updates clinic details."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    if doctor.user_id != current_user.id and current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this profile.")

    update_data = payload.dict(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(doctor, field, val)

    db.commit()
    db.refresh(doctor)
    return {"message": "Doctor profile updated successfully.", "doctor_id": doctor.id}

@router.patch("/{doctor_id}/availability")
def update_clinic_availability(
    doctor_id: int,
    payload: DoctorAvailabilityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Doctor updates clinic status (OPEN, PAUSED, CLOSED). Must be APPROVED."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    if doctor.user_id != current_user.id and current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=403, detail="You do not have permission to modify clinic status.")

    if doctor.account_status != AccountStatusEnum.APPROVED:
        raise HTTPException(
            status_code=403,
            detail="Your doctor account is currently awaiting approval. You cannot open clinic until approved."
        )

    status_upper = payload.clinic_status.upper().strip()
    if status_upper not in [s.value for s in ClinicStatusEnum]:
        raise HTTPException(status_code=400, detail="Invalid clinic status. Allowed: OPEN, PAUSED, CLOSED.")

    doctor.clinic_status = ClinicStatusEnum(status_upper)
    db.commit()
    db.refresh(doctor)
    return {"message": f"Clinic status updated to {doctor.clinic_status.value}.", "clinic_status": doctor.clinic_status.value}
