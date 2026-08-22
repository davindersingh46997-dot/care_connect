import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Enum, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base

class AccountStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"

class ClinicStatusEnum(str, enum.Enum):
    OPEN = "OPEN"
    PAUSED = "PAUSED"
    CLOSED = "CLOSED"

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    specialty = Column(String(100), index=True, nullable=False)
    qualification = Column(String(255), nullable=False)
    experience = Column(Integer, default=1, nullable=False)
    fee = Column(Float, default=300.0, nullable=False)
    clinic_name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    license_number = Column(String(100), nullable=True)
    working_hours = Column(String(100), default="09:00 AM - 06:00 PM", nullable=False)
    avg_consult_duration_mins = Column(Integer, default=10, nullable=False)
    bio = Column(Text, nullable=True)
    
    # State separation
    account_status = Column(Enum(AccountStatusEnum), default=AccountStatusEnum.PENDING, nullable=False, index=True)
    clinic_status = Column(Enum(ClinicStatusEnum), default=ClinicStatusEnum.CLOSED, nullable=False, index=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="doctor_profile")
    queue_entries = relationship("QueueEntry", back_populates="doctor", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="doctor", cascade="all, delete-orphan")
