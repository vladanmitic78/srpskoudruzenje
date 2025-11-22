from fastapi import APIRouter, Request

from models import ContactForm
from email_service import send_email, get_contact_form_notification

router = APIRouter()

@router.post("/")
async def submit_contact_form(form_data: ContactForm, request: Request):
    """Submit contact form"""
    # Send email to admin
    html, text = get_contact_form_notification(
        form_data.name,
        form_data.email,
        form_data.topic,
        form_data.message
    )
    
    await send_email(
        "info@srpskoudruzenjetaby.se",
        f"Nova poruka sa kontakt forme - {form_data.topic}",
        html,
        text
    )
    
    return {"success": True, "message": "Message sent successfully"}