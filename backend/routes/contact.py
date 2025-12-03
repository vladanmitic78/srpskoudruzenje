from fastapi import APIRouter, Request

from models import ContactForm
from email_service import send_email, get_contact_form_notification, get_contact_form_confirmation

router = APIRouter()

@router.post("/")
async def submit_contact_form(form_data: ContactForm, request: Request):
    """Submit contact form"""
    # Send notification email to admin
    admin_html, admin_text = get_contact_form_notification(
        form_data.name,
        form_data.email,
        form_data.topic,
        form_data.message
    )
    
    await send_email(
        "info@srpskoudruzenjetaby.se",
        f"Nova poruka sa kontakt forme - {form_data.topic}",
        admin_html,
        admin_text,
        db=request.app.state.db
    )
    
    # Send confirmation email to user (Serbian & Swedish)
    user_html, user_text = get_contact_form_confirmation(form_data.name)
    
    await send_email(
        form_data.email,
        "Hvala što ste nas kontaktirali / Tack för att du kontaktade oss - SKUD Täby",
        user_html,
        user_text,
        db=request.app.state.db
    )
    
    return {"success": True, "message": "Message sent successfully"}