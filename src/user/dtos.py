# dtos - 
from pydantic import BaseModel

# database schema for the user with the help of pydantic basemodel library 
class UserSchema(BaseModel):
    name: str                    # name of the database column followed by the data type of that particular column 
    username: str
    password: str
    email: str

# database schema for the user Response 
class UserResponseSchema(BaseModel):
    name: str
    username: str
    email: str
    id: int

# Login schema for the user database
class LoginSchema(BaseModel):
    username: str
    password: str

# database schema for profile updates
class UserUpdateSchema(BaseModel):
    name: str
    username: str
    email: str

# database schema for password updates
class PasswordUpdateSchema(BaseModel):
    current_password: str
    new_password: str

class LogoutResponse(BaseModel):
    message: str