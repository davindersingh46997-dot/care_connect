from typing import Optional
from pydantic import BaseModel, Field

class DoctorRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    specialty: str
    qualification: str
    experience: int = 1
    consultation_fee: float = 300.0
    clinic_name: str
    clinic_address: str
    latitude: float
    longitude: float
    working_hours: Optional[str] = "09:00 AM - 06:00 PM"
    professional_registration_number: Optional[str] = None
    profile_description: Optional[str] = None

    @property
    def fee(self):
        return self.consultation_fee

class DoctorUpdateRequest(BaseModel):
    specialty: Optional[str] = None
    qualification: Optional[str] = None
    experience: Optional[int] = None
    consultation_fee: Optional[float] = None
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    working_hours: Optional[str] = None
    profile_description: Optional[str] = None

class DoctorAvailabilityRequest(BaseModel):
    clinic_status: str

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
    clinic_status: str
    phone: Optional[str] = None
    professional_registration_number: Optional[str] = None
    profile_description: Optional[str] = None

    model_config = {"from_attributes": True}
