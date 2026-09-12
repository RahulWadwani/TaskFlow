from fastapi import APIRouter,status, Depends, Request, BackgroundTasks
from sqlalchemy.orm import Session
from src.user.dtos import UserSchema, LoginSchema, UserResponseSchema
from src.utils.db import get_db
from src.user import controller
# Import the new schemas at the top
from src.user.dtos import UserUpdateSchema, PasswordUpdateSchema, LogoutResponse

# this the api router call
user_router = APIRouter(prefix="/user")


@user_router.post("/register",response_model=UserResponseSchema,status_code=status.HTTP_201_CREATED)
async def register_user(body: UserSchema,bg_task: BackgroundTasks ,db: Session = Depends(get_db)):
    return await controller.register(body, db, bg_task)    


@user_router.post("/login",status_code=status.HTTP_200_OK)
def login_user(body: LoginSchema, db: Session = Depends(get_db)):
    return controller.login_user(body, db)    


@user_router.get("/is_auth",response_model=UserResponseSchema,status_code=status.HTTP_200_OK)
def is_auth(request:Request, db: Session = Depends(get_db)):
    return controller.is_authenticated(request, db)


@user_router.post("/logout", response_model=LogoutResponse, status_code=status.HTTP_200_OK)
def logout_user(request: Request, db: Session = Depends(get_db)):
    return controller.logout_user(request, db)


@user_router.put("/profile", response_model=UserResponseSchema, status_code=status.HTTP_200_OK)
def update_user_profile(body: UserUpdateSchema, request: Request, db: Session = Depends(get_db)):
    # Authenticate and get user
    current_user = controller.is_authenticated(request, db)
    return controller.update_profile(current_user.id, body, db)


@user_router.put("/password", status_code=status.HTTP_200_OK)
def update_user_password(body: PasswordUpdateSchema, request: Request, db: Session = Depends(get_db)):
    current_user = controller.is_authenticated(request, db)
    return controller.update_password(current_user.id, body, db)