from datetime import date
from pydantic import BaseModel
from typing import Optional


class TaskSchema(BaseModel):
    title: str
    description: Optional[str] = ""
    is_completed: bool = False
    priority: Optional[str] = "medium"
    due_date: Optional[date] = None


class TaskResponseSchema(BaseModel):
    id: int
    title: str
    description: Optional[str] = ""
    is_completed: bool = False
    priority: Optional[str] = "medium"
    due_date: Optional[date] = None
    user_id: Optional[int] = 0

    class Config:
        from_attributes = True