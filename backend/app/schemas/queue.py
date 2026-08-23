from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class QueueJoinRequest(BaseModel):
    doctor_id: int
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None

class QueueActionRequest(BaseModel):
    queue_id: Optional[int] = None

class QueueEntryResponse(BaseModel):
    id: int
    doctor_id: int
    patient_id: int
    patient_name: str
    patient_phone: Optional[str] = None
    token_number: int
    status: str
    created_at: datetime
    called_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

