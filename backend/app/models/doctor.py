import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Enum, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base

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
    experience_years = Column(Integer, default=1, nullable=False)
    consultation_fee = Column(Float, default=300.0, nullable=False)
    clinic_name = Column(String(255), nullable=False)
    clinic_address = Column(String(500), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    phone = Column(String(50), nullable=True)
    professional_registration_number = Column(String(100), nullable=True)
    profile_description = Column(Text, nullable=True)
    rating = Column(Float, default=0.0, nullable=False)
    review_count = Column(Integer, default=0, nullable=False)
    clinic_status = Column(Enum(ClinicStatusEnum), default=ClinicStatusEnum.CLOSED, nullable=False, index=True)
    average_consultation_minutes = Column(Integer, default=15, nullable=False)
    working_hours = Column(String(100), default="09:00 AM - 06:00 PM", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="doctor_profile")
    queue_entries = relationship("QueueEntry", back_populates="doctor", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="doctor", cascade="all, delete-orphan")

    @property
    def experience(self):
        return self.experience_years

    @experience.setter
    def experience(self, value):
        self.experience_years = value

    @property
    def fee(self):
        return self.consultation_fee

    @fee.setter
    def fee(self, value):
        self.consultation_fee = value

    @property
    def address(self):
        return self.clinic_address

    @address.setter
    def address(self, value):
        self.clinic_address = value

    @property
    def bio(self):
        return self.profile_description

    @bio.setter
    def bio(self, value):
        self.profile_description = value

    @property
    def avg_consult_duration_mins(self):
        return self.average_consultation_minutes

    @avg_consult_duration_mins.setter
    def avg_consult_duration_mins(self, value):
        self.average_consultation_minutes = value
