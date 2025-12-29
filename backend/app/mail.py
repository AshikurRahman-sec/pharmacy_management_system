from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
from typing import List
import os

conf = ConnectionConfig(
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM = os.getenv("MAIL_FROM", "noreply@example.com"),
    MAIL_PORT = int(os.getenv("MAIL_PORT", "587")),
    MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.example.com"),
    MAIL_STARTTLS = os.getenv("MAIL_STARTTLS", "true").lower() == 'true',
    MAIL_SSL_TLS = os.getenv("MAIL_SSL_TLS", "false").lower() == 'true',
    USE_CREDENTIALS = os.getenv("USE_CREDENTIALS", "true").lower() == 'true',
    VALIDATE_CERTS = os.getenv("VALIDATE_CERTS", "true").lower() == 'true'
)

async def send_email(email: List[EmailStr], password: str):
    message = MessageSchema(
        subject="Your new account credentials",
        recipients=email,
        body=f"Your new account has been created. Your password is: {password}",
        subtype="html"
    )

    fm = FastMail(conf)
    await fm.send_message(message)
