from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from src.utils.setting import settings

base = declarative_base()
engine = create_engine(
    url = settings.DB_CONNECTION,
    pool_pre_ping=True
    )
Localsession = sessionmaker(bind=engine)

def get_db():
    session=Localsession()
    try:
        yield session
    finally:
        session.close()