from typing import Optional
from pydantic import BaseModel

class UserRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    age: Optional[int] = None
    phone: Optional[str] = None
    location: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    age: Optional[int] = None
    phone: Optional[str] = None
    location: Optional[str] = None

    class Config:
        orm_mode = True
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
