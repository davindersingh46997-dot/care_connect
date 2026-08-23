from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database import get_db
from backend.app.models.user import User, RoleEnum
from backend.app.models.patient import Patient
from backend.app.models.doctor import Doctor, ClinicStatusEnum
from backend.app.models.queue import QueueEntry, QueueStatusEnum

from backend.app.schemas.queue import QueueJoinRequest, QueueActionRequest
from backend.app.utils.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/queue", tags=["Queue Management"])

@router.post("/join", status_code=status.HTTP_201_CREATED)
def join_digital_queue(
    payload: QueueJoinRequest,
    current_user: User = Depends(require_role(RoleEnum.PATIENT)),
    db: Session = Depends(get_db)
):
    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    if doctor.clinic_status == ClinicStatusEnum.CLOSED:
        raise HTTPException(status_code=400, detail="This clinic is currently closed and not accepting patients into the queue.")
    if doctor.clinic_status == ClinicStatusEnum.PAUSED:
        raise HTTPException(status_code=400, detail="This clinic has temporarily paused new queue entries.")

    # Check for existing active queue entry for this patient & doctor
    existing_active = db.query(QueueEntry).filter(
        QueueEntry.doctor_id == doctor.id,
        QueueEntry.patient_id == current_user.id,
        QueueEntry.status.in_([QueueStatusEnum.WAITING, QueueStatusEnum.CONSULTING])
    ).first()

    if existing_active:
        return {
            "message": "You are already active in the queue for this clinic.",
            "already_joined": True,
            "token_number": existing_active.token_number,
            "status": existing_active.status.value
        }

    # Generate sequential token number for this doctor
    max_token = db.query(func.max(QueueEntry.token_number)).filter(
        QueueEntry.doctor_id == doctor.id
    ).scalar() or 0

    new_token = max_token + 1

    patient_phone_val = payload.patient_phone
    if not patient_phone_val:
        patient_profile = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        patient_phone_val = patient_profile.phone if patient_profile else None

    entry = QueueEntry(
        doctor_id=doctor.id,
        patient_id=current_user.id,
        patient_name=payload.patient_name or current_user.name,
        patient_phone=patient_phone_val,
        token_number=new_token,
        status=QueueStatusEnum.WAITING
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Calculate real waiting line
    waiting_ahead = db.query(QueueEntry).filter(
        QueueEntry.doctor_id == doctor.id,
        QueueEntry.status == QueueStatusEnum.WAITING,
        QueueEntry.created_at < entry.created_at
    ).count()

    is_consulting = db.query(QueueEntry).filter(
        QueueEntry.doctor_id == doctor.id,
        QueueEntry.status == QueueStatusEnum.CONSULTING
    ).count() > 0

    patients_ahead = waiting_ahead + (1 if is_consulting else 0)
    avg_duration = doctor.avg_consult_duration_mins or 10
    est_wait = max(5, patients_ahead * avg_duration)

    return {
        "message": f"Successfully joined queue. Your Token is #{entry.token_number}.",
        "already_joined": False,
        "token_number": entry.token_number,
        "patients_ahead": patients_ahead,
        "estimated_wait_mins": est_wait,
        "is_next": patients_ahead == 0,
        "queue_id": entry.id
    }

@router.get("/patient")
def get_patient_live_queue(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve current authenticated patient's active queue token and dynamic wait."""
    active_entry = db.query(QueueEntry).filter(
        QueueEntry.patient_id == current_user.id,
        QueueEntry.status.in_([QueueStatusEnum.WAITING, QueueStatusEnum.CONSULTING])
    ).order_by(QueueEntry.created_at.desc()).first()

    if not active_entry:
        # Fetch past completed visits
        completed_visits = db.query(QueueEntry).filter(
            QueueEntry.patient_id == current_user.id,
            QueueEntry.status == QueueStatusEnum.COMPLETED
        ).order_by(QueueEntry.completed_at.desc()).all()

        visits_data = []
        for v in completed_visits:
            doc = v.doctor
            visits_data.append({
                "id": v.id,
                "token_number": v.token_number,
                "doctor_id": v.doctor_id,
                "doctor_name": doc.user.name if doc and doc.user else None,
                "specialty": doc.specialty if doc else None,
                "clinic_name": doc.clinic_name if doc else None,
                "completed_at": v.completed_at.strftime("%Y-%m-%d %H:%M") if v.completed_at else None
            })

        return {
            "has_active_queue": False,
            "active_queue": None,
            "recent_visits": visits_data
        }

    doctor = active_entry.doctor
    consulting_entry = db.query(QueueEntry).filter(
        QueueEntry.doctor_id == active_entry.doctor_id,
        QueueEntry.status == QueueStatusEnum.CONSULTING
    ).first()

    current_serving_token = consulting_entry.token_number if consulting_entry else (
        db.query(func.max(QueueEntry.token_number)).filter(
            QueueEntry.doctor_id == active_entry.doctor_id,
            QueueEntry.status == QueueStatusEnum.COMPLETED
        ).scalar() or 0
    )

    is_currently_consulting = (active_entry.status == QueueStatusEnum.CONSULTING)

    if is_currently_consulting:
        patients_ahead = 0
        est_wait = 0
        is_next = True
        alert_msg = "🩺 You're in consultation now with the doctor!"
    else:
        waiting_ahead = db.query(QueueEntry).filter(
            QueueEntry.doctor_id == active_entry.doctor_id,
            QueueEntry.status == QueueStatusEnum.WAITING,
            QueueEntry.created_at < active_entry.created_at
        ).count()
        patients_ahead = waiting_ahead + (1 if consulting_entry else 0)
        avg_dur = doctor.avg_consult_duration_mins or 10
        est_wait = patients_ahead * avg_dur
        is_next = (patients_ahead == 0)
        alert_msg = "🔔 You're next! Please proceed into the clinic." if is_next else None

    return {
        "has_active_queue": True,
        "active_queue": {
            "id": active_entry.id,
            "token_number": active_entry.token_number,
            "status": active_entry.status.value,
            "created_at": active_entry.created_at.strftime("%Y-%m-%d %H:%M"),
            "current_token": current_serving_token,
            "patients_ahead": patients_ahead,
            "estimated_wait_mins": est_wait,
            "is_next": is_next,
            "alert_message": alert_msg,
            "doctor": {
                "id": doctor.id,
                "name": doctor.user.name if doctor.user else None,
                "specialty": doctor.specialty,
                "clinic_name": doctor.clinic_name,
                "address": doctor.address,
                "fee": doctor.fee,
                "clinic_status": doctor.clinic_status.value
            }
        }
    }

@router.get("/doctor")
@router.get("/doctor/{doctor_id}")
def get_doctor_live_queue(
    doctor_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Doctor retrieves today's live queue desk."""
    if doctor_id is None:
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    else:
        doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    if doctor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied. You can only view your own clinic queue.")


    entries = db.query(QueueEntry).filter(QueueEntry.doctor_id == doctor.id).all()

    consulting = next((e for e in entries if e.status == QueueStatusEnum.CONSULTING), None)
    waiting = sorted(
        [e for e in entries if e.status == QueueStatusEnum.WAITING],
        key=lambda x: x.token_number
    )
    completed = sorted(
        [e for e in entries if e.status == QueueStatusEnum.COMPLETED],
        key=lambda x: x.completed_at or x.created_at,
        reverse=True
    )
    skipped = [e for e in entries if e.status == QueueStatusEnum.SKIPPED]

    current_token = consulting.token_number if consulting else (
        completed[0].token_number if completed else 0
    )
    avg_dur = doctor.avg_consult_duration_mins or 10
    total_wait_est = (len(waiting) + (1 if consulting else 0)) * avg_dur

    return {
        "doctor": {
            "id": doctor.id,
            "name": doctor.user.name if doctor.user else "Doctor",
            "specialty": doctor.specialty,
            "clinic_name": doctor.clinic_name,
            "clinic_status": doctor.clinic_status.value,
            "current_token": current_token
        },
        "overview": {
            "total_today": len(entries),
            "completed_count": len(completed),
            "waiting_count": len(waiting),
            "current_token": current_token,
            "estimated_wait_mins": total_wait_est
        },
        "consulting": {
            "id": consulting.id,
            "token_number": consulting.token_number,
            "patient_name": consulting.patient_name,
            "patient_phone": consulting.patient_phone,
            "called_at": consulting.called_at.strftime("%H:%M") if consulting.called_at else None
        } if consulting else None,
        "waiting": [
            {
                "id": w.id,
                "token_number": w.token_number,
                "patient_name": w.patient_name,
                "patient_phone": w.patient_phone,
                "joined_at": w.created_at.strftime("%H:%M")
            } for w in waiting
        ],
        "completed": [
            {
                "id": c.id,
                "token_number": c.token_number,
                "patient_name": c.patient_name,
                "completed_at": c.completed_at.strftime("%H:%M") if c.completed_at else None
            } for c in completed
        ],
        "skipped": [
            {
                "id": s.id,
                "token_number": s.token_number,
                "patient_name": s.patient_name
            } for s in skipped
        ]
    }

@router.post("/call-next")
def doctor_call_next_patient(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Doctor advances the queue: current patient -> COMPLETED, next waiting -> CONSULTING."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=403, detail="Only registered doctors can manage queues.")

    now = datetime.now(timezone.utc)

    # 1. Complete existing consulting patient
    current_consulting = db.query(QueueEntry).filter(
        QueueEntry.doctor_id == doctor.id,
        QueueEntry.status == QueueStatusEnum.CONSULTING
    ).first()

    if current_consulting:
        current_consulting.status = QueueStatusEnum.COMPLETED
        current_consulting.completed_at = now

    # 2. Call next waiting patient
    next_patient = db.query(QueueEntry).filter(
        QueueEntry.doctor_id == doctor.id,
        QueueEntry.status == QueueStatusEnum.WAITING
    ).order_by(QueueEntry.token_number.asc()).first()

    if next_patient:
        next_patient.status = QueueStatusEnum.CONSULTING
        next_patient.called_at = now
        db.commit()
        db.refresh(next_patient)
        return {
            "message": f"Called Token #{next_patient.token_number} ({next_patient.patient_name}).",
            "called_patient": {
                "token_number": next_patient.token_number,
                "patient_name": next_patient.patient_name
            }
        }
    else:
        db.commit()
        return {
            "message": "All waiting patients completed. Queue is now empty.",
            "called_patient": None
        }

@router.post("/complete")
def doctor_complete_consultation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Doctor marks the active consultation as completed."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=403, detail="Only registered doctors can complete consultations.")

    current_consulting = db.query(QueueEntry).filter(
        QueueEntry.doctor_id == doctor.id,
        QueueEntry.status == QueueStatusEnum.CONSULTING
    ).first()

    if current_consulting:
        current_consulting.status = QueueStatusEnum.COMPLETED
        current_consulting.completed_at = datetime.now(timezone.utc)
        db.commit()
        return {"message": f"Consultation for Token #{current_consulting.token_number} completed."}

    return {"message": "No patient was currently in consultation."}

@router.post("/skip")
def doctor_skip_patient(
    payload: QueueActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Doctor skips an absent patient."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=403, detail="Only doctors can skip queue entries.")

    if payload.queue_id:
        target = db.query(QueueEntry).filter(
            QueueEntry.id == payload.queue_id,
            QueueEntry.doctor_id == doctor.id
        ).first()
    else:
        target = db.query(QueueEntry).filter(
            QueueEntry.doctor_id == doctor.id,
            QueueEntry.status.in_([QueueStatusEnum.CONSULTING, QueueStatusEnum.WAITING])
        ).order_by(QueueEntry.token_number.asc()).first()

    if target:
        target.status = QueueStatusEnum.SKIPPED
        db.commit()
        return {"message": f"Token #{target.token_number} marked as skipped."}

    raise HTTPException(status_code=404, detail="Queue entry to skip not found.")

@router.post("/leave")
def patient_leave_queue(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Patient voluntarily leaves the queue."""
    target = db.query(QueueEntry).filter(
        QueueEntry.patient_id == current_user.id,
        QueueEntry.status.in_([QueueStatusEnum.WAITING, QueueStatusEnum.CONSULTING])
    ).first()

    if not target:
        raise HTTPException(status_code=404, detail="No active queue token found to cancel.")

    target.status = QueueStatusEnum.CANCELLED
    db.commit()
    return {"message": "You have left the queue successfully."}
