from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class ReviewCreateRequest(BaseModel):
    queue_entry_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    id: int
    doctor_id: int
    patient_id: int
    queue_entry_id: int
    patient_name: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

