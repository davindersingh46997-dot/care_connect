import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class QueueStatusEnum(str, enum.Enum):
    WAITING = "WAITING"
    CONSULTING = "CONSULTING"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"
    CANCELLED = "CANCELLED"

class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_name = Column(String(255), nullable=False)
    patient_phone = Column(String(50), nullable=True)
    token_number = Column(Integer, nullable=False)
    status = Column(Enum(QueueStatusEnum), default=QueueStatusEnum.WAITING, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    called_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    doctor = relationship("Doctor", back_populates="queue_entries")
    patient = relationship("User", back_populates="queue_entries", foreign_keys=[patient_id])
    review = relationship("Review", back_populates="queue_entry", uselist=False)
