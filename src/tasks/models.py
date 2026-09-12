from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from src.utils.db import base


class TaskModel(base):
    __tablename__ = "user_tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    is_completed = Column(Boolean, default=False)

    priority = Column(String, default="medium")
    due_date = Column(Date, nullable=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )