import jwt 
import uuid
from jwt import InvalidTokenError
from fastapi import HTTPException,status,Request, BackgroundTasks
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from pwdlib import PasswordHash
from src.user.models import UserModel, TokenBlocklist   # user models 
from src.user.dtos import UserSchema    # user schemas 
from src.utils.setting import settings
from src.utils.mail import send_email

# created an object of the password 
password_hash = PasswordHash.recommended()


# Creating a function for encrypting the password 
def get_password_hash(password: str):
    return password_hash.hash(password)

# Creating a function to verifying the password which is used to convert the hashed password saved in the database to plain password in order to verify the user has entered the correct credentials or not 
def verify_password(plain_password,hash_password):
    return password_hash.verify(plain_password,hash_password)


# function to register the user if not present in the database 
async def register(body: UserSchema, db: Session ,bg_task:BackgroundTasks):
    # 1. username validations for if the username exists in the db or not 
    is_user = db.query(UserModel).filter(UserModel.username == body.username).first()
    if is_user:
        raise HTTPException(status_code=400, detail="Username already exists") # raise 400 http error for pre-existing user

    # 2. email validations
    is_email = db.query(UserModel).filter(UserModel.email == body.email).first()
    if is_email:
        raise HTTPException(status_code=400, detail="Email already exists") # raise 400 http error for pre-existing email address of the user

    # 3. hashing the password 
    hash_password = get_password_hash(body.password)

    # 4. updating the user database with hashed password 
    new_user = UserModel(
        name=body.name,
        username=body.username,
        hash_password=hash_password,
        email=body.email
    )
    # print(new_user)
    # updating the database with user having hashed password 
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # send email confirmation     
    bg_task.add_task(send_email, [new_user.email])

    # finally returning the data 
    return new_user


# logging the user in
def login_user(body: UserSchema, db: Session):
    user = (
        db.query(UserModel)
        .filter(UserModel.username == body.username)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You entered wrong username."
        )

    if not verify_password(body.password, user.hash_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You entered wrong password."
        )

    exp_time = datetime.now() + timedelta(
        minutes=int(settings.EXP_Time)
    )

    # unique id for this specific token, needed so logout can revoke just this one without affecting other sessions
    jti = str(uuid.uuid4())

    token = jwt.encode(
        {
            "_id": user.id,
            "jti": jti,
            "exp": exp_time
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    print("LOGIN TOKEN GENERATED")
    print("USER ID:", user.id)
    print("ALGORITHM:", settings.ALGORITHM)

    return {
        "token": token
    }


# token send (check whether the user exist or not with valid token)
def is_authenticated(requests:Request,db:Session):
    try:
        token = requests.headers.get("authorization")
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "You are unauthorised")

        # token value is added in the following manner "jwt <token generated>"
        token = token.split(" ")[-1]
        data = jwt.decode(token,settings.SECRET_KEY,settings.ALGORITHM) # decoding the jwt token 
        print(data)
        user_id = data.get("_id") # get the id of that particular user 
        exp_time = data.get("exp") # get the time the user has logged in 
        current_time = datetime.now().timestamp() # current time 
        jti = data.get("jti") # unique id of this token, if present

        # token expiry logic
        if current_time > exp_time:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "You are unauthorised")

        # reject the token if it has been logged out / revoked
        if jti:
            blocked = db.query(TokenBlocklist).filter(TokenBlocklist.jti == jti).first()
            if blocked:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "You are unauthorised")

        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "You are unauthorised ")

        return user

    except InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "You are unauthorised ")


# logging the user out by revoking the current token so it can no longer be used, even before it expires
def logout_user(requests: Request, db: Session):
    token = requests.headers.get("authorization")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You are unauthorised")

    token = token.split(" ")[-1]

    try:
        data = jwt.decode(token, settings.SECRET_KEY, settings.ALGORITHM)
    except InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You are unauthorised")

    jti = data.get("jti")
    user_id = data.get("_id")
    exp_timestamp = data.get("exp")

    # tokens issued before the jti field existed have no way to be individually revoked
    if not jti:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This token cannot be revoked")

    already_blocked = db.query(TokenBlocklist).filter(TokenBlocklist.jti == jti).first()
    if already_blocked:
        return {"message": "Already logged out"}

    blocked_token = TokenBlocklist(
        jti=jti,
        user_id=user_id,
        expires_at=datetime.fromtimestamp(exp_timestamp)
    )
    db.add(blocked_token)
    db.commit()

    return {"message": "Logged out successfully"}


# Update user profile information
def update_profile(user_id: int, body: UserSchema, db: Session):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if new username/email already exists for another user
    existing_user = db.query(UserModel).filter(
        ((UserModel.username == body.username) | (UserModel.email == body.email)) & 
        (UserModel.id != user_id)
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already in use")

    user.name = body.name
    user.username = body.username
    user.email = body.email
    db.commit()
    db.refresh(user)
    return user

# Update user password
def update_password(user_id: int, body: dict, db: Session):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(body.current_password, user.hash_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect current password")
    
    user.hash_password = get_password_hash(body.new_password)
    db.commit()
    return {"message": "Password updated successfully"}