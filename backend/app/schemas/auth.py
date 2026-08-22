from typing import Optional
from pydantic import BaseModel, Field

class UserRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    age: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    age: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
