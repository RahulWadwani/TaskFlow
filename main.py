from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from datetime import datetime
from src.utils.db import base, engine
# from src.tasks.models import TaskModel  # just to create the table in the database and check whether the table is created or not 
from src.tasks.router import task_router
from src.user.router import user_router
from src.frontend.router import frontend_router as fd
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Task Management App")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # We will lock this down to your Vercel domain later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


#creating a mountpoint
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# database creation and connection  (one time use case )
base.metadata.create_all(bind=engine)

app.include_router(task_router)
app.include_router(user_router)
app.include_router(fd)  # frontend router