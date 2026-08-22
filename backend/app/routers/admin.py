from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User, RoleEnum
from backend.app.models.doctor import Doctor, AccountStatusEnum, ClinicStatusEnum
from backend.app.utils.dependencies import require_role

router = APIRouter(
    prefix="/api/admin",
    tags=["Administrator"],
    dependencies=[Depends(require_role(RoleEnum.ADMIN))]
)

@router.get("/doctors/pending")
def list_pending_doctors(db: Session = Depends(get_db)):
    """Admin views all doctors awaiting verification."""
    pending_docs = db.query(Doctor).filter(Doctor.account_status == AccountStatusEnum.PENDING).all()
    return [
        {
            "id": d.id,
            "name": d.user.name if d.user else "Dr. Applicant",
            "email": d.user.email if d.user else "",
            "specialty": d.specialty,
            "qualification": d.qualification,
            "experience": d.experience,
            "fee": d.fee,
            "clinic_name": d.clinic_name,
            "address": d.address,
            "license_number": d.license_number,
            "working_hours": d.working_hours,
            "bio": d.bio,
            "account_status": d.account_status.value,
            "created_at": d.created_at.strftime("%Y-%m-%d %H:%M")
        } for d in pending_docs
    ]

@router.get("/doctors")
def list_all_doctors(db: Session = Depends(get_db)):
    """Admin views all registered doctors across all statuses."""
    all_docs = db.query(Doctor).all()
    return [
        {
            "id": d.id,
            "name": d.user.name if d.user else "Dr. Applicant",
            "email": d.user.email if d.user else "",
            "specialty": d.specialty,
            "qualification": d.qualification,
            "experience": d.experience,
            "fee": d.fee,
            "clinic_name": d.clinic_name,
            "address": d.address,
            "license_number": d.license_number,
            "account_status": d.account_status.value,
            "clinic_status": d.clinic_status.value,
            "created_at": d.created_at.strftime("%Y-%m-%d %H:%M")
        } for d in all_docs
    ]

@router.post("/doctors/{doctor_id}/approve")
def approve_doctor_account(doctor_id: int, db: Session = Depends(get_db)):
    """Admin approves a doctor account, making them publicly searchable."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    doctor.account_status = AccountStatusEnum.APPROVED
    db.commit()
    db.refresh(doctor)
    return {
        "message": f"Doctor account for {doctor.user.name if doctor.user else 'Doctor'} has been APPROVED.",
        "doctor_id": doctor.id,
        "account_status": doctor.account_status.value
    }

@router.post("/doctors/{doctor_id}/reject")
def reject_doctor_account(doctor_id: int, db: Session = Depends(get_db)):
    """Admin rejects a doctor account."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    doctor.account_status = AccountStatusEnum.REJECTED
    doctor.clinic_status = ClinicStatusEnum.CLOSED
    db.commit()
    db.refresh(doctor)
    return {
        "message": f"Doctor account for {doctor.user.name if doctor.user else 'Doctor'} has been REJECTED.",
        "doctor_id": doctor.id,
        "account_status": doctor.account_status.value
    }

@router.post("/doctors/{doctor_id}/suspend")
def suspend_doctor_account(doctor_id: int, db: Session = Depends(get_db)):
    """Admin suspends a doctor account."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    doctor.account_status = AccountStatusEnum.SUSPENDED
    doctor.clinic_status = ClinicStatusEnum.CLOSED
    db.commit()
    db.refresh(doctor)
    return {
        "message": f"Doctor account for {doctor.user.name if doctor.user else 'Doctor'} has been SUSPENDED.",
        "doctor_id": doctor.id,
        "account_status": doctor.account_status.value
    }
