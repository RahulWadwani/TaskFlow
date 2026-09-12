from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr, BaseModel
from typing import List


conf = ConnectionConfig(
    MAIL_USERNAME = "rahulwadwani786@gmail.com",
    MAIL_PASSWORD = "nuwd syzf xdal jgfa",
    MAIL_FROM = "rahulwadwani786@gmail.com",
    MAIL_PORT = 587,
    MAIL_SERVER = "smtp.gmail.com",
    MAIL_FROM_NAME="Rahul Wadwani",
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

async def send_email(emails: List[str]):
    html = """<p>Thank you for registration </p> """

    message = MessageSchema(
        subject    = "Registration Confirmation",
        recipients = emails,
        body       = html,
        subtype    = MessageType.html
        )

    fm = FastMail(conf)
    await fm.send_message(message)
    return {"Message":"mail has been sent"}