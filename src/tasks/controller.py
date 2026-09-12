from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.tasks.dtos import TaskSchema
from src.tasks.models import TaskModel
from src.user.models import UserModel


def create_task(body: TaskSchema, db: Session, user_id: int):
    data = body.model_dump()
    new_task = TaskModel(**data, user_id=user_id)

    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task


def get_task(db: Session, user: UserModel):
    return db.query(TaskModel).filter(TaskModel.user_id == user.id).all()


def get_one_task(task_id: int, db: Session, user: UserModel):
    one_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()

    if not one_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with id {task_id} not found",
        )

    if one_task.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to access this task",
        )

    return one_task


def update_task(body: TaskSchema, task_id: int, db: Session, user: UserModel):
    one_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()

    if not one_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with id {task_id} not found",
        )

    if one_task.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to update this task",
        )

    task_data = body.model_dump()
    for key, value in task_data.items():
        setattr(one_task, key, value)

    db.add(one_task)
    db.commit()
    db.refresh(one_task)
    return one_task


def delete_task(task_id: int, db: Session, user: UserModel):
    one_task = db.query(TaskModel).filter(TaskModel.id == task_id).first()

    if not one_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with id {task_id} not found",
        )

    if one_task.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to delete this task",
        )

    db.delete(one_task)
    db.commit()
    return None