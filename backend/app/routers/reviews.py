from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User, RoleEnum
from backend.app.models.doctor import Doctor
from backend.app.models.queue import QueueEntry, QueueStatusEnum
from backend.app.models.review import Review
from backend.app.schemas.review import ReviewCreateRequest, ReviewResponse
from backend.app.utils.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/doctors", tags=["Reviews"])

@router.get("/{doctor_id}/reviews")
def get_doctor_reviews(doctor_id: int, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    reviews = db.query(Review).filter(Review.doctor_id == doctor_id).order_by(Review.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "patient_name": r.patient_name,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at.strftime("%Y-%m-%d")
        } for r in reviews
    ]

@router.post("/{doctor_id}/reviews", status_code=status.HTTP_201_CREATED)
def submit_doctor_review(
    doctor_id: int,
    payload: ReviewCreateRequest,
    current_user: User = Depends(require_role(RoleEnum.PATIENT)),
    db: Session = Depends(get_db)
):
    """Submit a verified review. Strict requirement: Patient must have a COMPLETED consultation."""
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found.")

    # Verify queue entry belongs to this patient and doctor and is COMPLETED
    queue_entry = db.query(QueueEntry).filter(
        QueueEntry.id == payload.queue_entry_id,
        QueueEntry.doctor_id == doctor_id,
        QueueEntry.patient_id == current_user.id,
        QueueEntry.status == QueueStatusEnum.COMPLETED
    ).first()

    if not queue_entry:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only patients with a completed consultation with this doctor may submit a review."
        )

    # Check if this queue entry was already reviewed
    existing_review = db.query(Review).filter(Review.queue_entry_id == payload.queue_entry_id).first()
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A review has already been submitted for this consultation visit."
        )

    new_review = Review(
        doctor_id=doctor_id,
        patient_id=current_user.id,
        queue_entry_id=payload.queue_entry_id,
        patient_name=current_user.name,
        rating=payload.rating,
        comment=payload.comment.strip() if payload.comment else None
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    return {
        "message": "Thank you! Your verified patient review has been posted.",
        "review_id": new_review.id,
        "id": new_review.id,
        "rating": new_review.rating,
        "comment": new_review.comment,
        "patient_name": new_review.patient_name
    }
