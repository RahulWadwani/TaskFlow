from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from datetime import datetime
from src.utils.db import base

# creating the table in the database like for suppose in this project we are using the postgresql db 
# following class signifies the usermodel for the table what the table consist of and the datatype is primary key in the database or not 
class UserModel(base):
    __tablename__ = "users"        # defining the databases name/ tablename
    
    id = Column(Integer, primary_key=True, index=True)                   # column(datatype, primary_key , Index )
    name = Column(String, unique=True, index=True, nullable=False)       # column(datatype, unique , Index )
    username = Column(String, unique=True, index=True, nullable=False)   # column(datatype, primary_key , Index )
    hash_password = Column(String, nullable=False)                       # column(datatype, primary_key , Index )
    email = Column(String, unique=True, index=True, nullable=False)      # column(datatype, primary_key , Index )


# table to track logged-out (revoked) tokens so they can no longer be used even before they expire
class TokenBlocklist(base):
    __tablename__ = "token_blocklist"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String, unique=True, index=True, nullable=False)         # unique id of the token being revoked
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)     # which user the revoked token belonged to
    expires_at = Column(DateTime, nullable=False)                         # original expiry of the token (for cleanup)
    created_at = Column(DateTime, default=datetime.utcnow)                # when the logout happened