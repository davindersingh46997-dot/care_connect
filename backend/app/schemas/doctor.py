from typing import Optional, List
from pydantic import BaseModel

class DoctorRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    specialty: str
    qualification: str
    experience: int = 1
    fee: float = 300.0
    clinic_name: str
    address: str
    latitude: float
    longitude: float
    license_number: Optional[str] = None
    working_hours: Optional[str] = "09:00 AM - 06:00 PM"
    avg_consult_duration_mins: Optional[int] = 10
    bio: Optional[str] = None

class DoctorUpdateRequest(BaseModel):
    specialty: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[int] = None
    fee: Optional[float] = None
    clinic_name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    working_hours: Optional[str] = None
    avg_consult_duration_mins: Optional[int] = None
    bio: Optional[str] = None

class DoctorAvailabilityRequest(BaseModel):
    clinic_status: str  # "OPEN", "PAUSED", "CLOSED"

class DoctorResponse(BaseModel):
    id: int
    user_id: int
    name: str
    email: str
    specialty: str
    qualification: str
    experience: int
    fee: float
    clinic_name: str
    address: str
    latitude: float
    longitude: float
    working_hours: str
    avg_consult_duration_mins: int
    bio: Optional[str] = None
    account_status: str
    clinic_status: str

    class Config:
        orm_mode = True
        from_attributes = True
