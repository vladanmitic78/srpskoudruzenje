from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile, File
from fastapi.responses import StreamingResponse
from datetime import datetime
from export_utils import generate_members_pdf, generate_members_xml, generate_members_excel

from dependencies import get_admin_user, get_superadmin_user

router = APIRouter()

@router.get("/users")
async def get_all_users(admin: dict = Depends(get_admin_user), request: Request = None):
    """Get all users (Admin only)"""
    db = request.app.state.db
    cursor = db.users.find().sort("createdAt", -1)
    users_list = await cursor.to_list(length=1000)
    
    # Remove sensitive data
    for user in users_list:
        user.pop("hashed_password", None)
        user.pop("verificationToken", None)
        user["id"] = str(user.pop("_id"))
    
    return {"users": users_list}

@router.get("/statistics")
async def get_statistics(admin: dict = Depends(get_admin_user), request: Request = None):
    """Get statistics (Admin only)"""
    db = request.app.state.db
    
    # Count users with role "user"
    total_members = await db.users.count_documents({"role": "user"})
    
    # Count invoices
    paid_invoices = await db.invoices.count_documents({"status": "paid"})
    unpaid_invoices = await db.invoices.count_documents({"status": "unpaid"})
    
    # Calculate revenue
    paid_invoices_list = await db.invoices.find({"status": "paid"}).to_list(length=10000)
    total_revenue = sum(inv.get("amount", 0) for inv in paid_invoices_list)
    
    # Count overdue invoices (7+ days past due date)
    now = datetime.utcnow()
    all_unpaid = await db.invoices.find({"status": "unpaid"}).to_list(length=10000)
    overdue_count = 0
    
    for inv in all_unpaid:
        try:
            due_date = datetime.fromisoformat(inv.get("dueDate", ""))
            if (now - due_date).days > 7:
                overdue_count += 1
        except:
            pass
    
    return {
        "totalMembers": total_members,
        "paidInvoices": paid_invoices,
        "unpaidInvoices": unpaid_invoices,
        "totalRevenue": total_revenue,
        "overdueInvoices": overdue_count
    }

@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    superadmin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """Suspend user account (Super Admin only)"""
    db = request.app.state.db
    
    result = await db.users.update_one(
        {"_id": user_id},
        {"$set": {"suspended": True, "suspendedAt": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "User suspended successfully"}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Delete user account (Admin only)"""
    db = request.app.state.db
    
    # Don't allow deleting superadmin
    user = await db.users.find_one({"_id": user_id})
    if user and user.get("role") == "superadmin":
        raise HTTPException(status_code=403, detail="Cannot delete super admin")
    
    # Delete user
    result = await db.users.delete_one({"_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Also delete related data
    await db.invoices.delete_many({"userId": user_id})
    await db.cancellation_requests.delete_many({"userId": user_id})
    
    return {"success": True, "message": "User and related data deleted successfully"}

@router.get("/export/members/pdf")
async def export_members_pdf(admin: dict = Depends(get_admin_user), request: Request = None):
    """Export members to PDF"""
    db = request.app.state.db
    
    users = await db.users.find({"role": "user"}).to_list(length=10000)
    pdf_buffer = generate_members_pdf(users)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=members_{datetime.utcnow().strftime('%Y%m%d')}.pdf"}
    )

@router.get("/export/members/xml")
async def export_members_xml(admin: dict = Depends(get_admin_user), request: Request = None):
    """Export members to XML"""
    db = request.app.state.db
    
    users = await db.users.find({"role": "user"}).to_list(length=10000)
    xml_buffer = generate_members_xml(users)
    
    return StreamingResponse(
        xml_buffer,
        media_type="application/xml",
        headers={"Content-Disposition": f"attachment; filename=members_{datetime.utcnow().strftime('%Y%m%d')}.xml"}
    )

@router.get("/export/members/excel")
async def export_members_excel(admin: dict = Depends(get_admin_user), request: Request = None):
    """Export members to Excel"""
    db = request.app.state.db
    
    users = await db.users.find({"role": "user"}).to_list(length=10000)
    excel_buffer = generate_members_excel(users)
    
    return StreamingResponse(
        excel_buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=members_{datetime.utcnow().strftime('%Y%m%d')}.xlsx"}
    )

@router.get("/users/{user_id}/details")
async def get_user_details(
    user_id: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Get full user details including parent info"""
    db = request.app.state.db
    
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove sensitive data
    user.pop("hashed_password", None)
    user.pop("verificationToken", None)
    user.pop("resetToken", None)
    user["id"] = str(user.pop("_id"))
    
    # Get user's invoices
    invoices = await db.invoices.find({"userId": user_id}).to_list(length=100)
    
    return {
        "user": user,
        "invoices": invoices,
        "invoiceCount": len(invoices)
    }

# Super Admin Only Routes
@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    user_data: dict,
    superadmin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """Update user details (Super Admin only)"""
    db = request.app.state.db
    
    update_fields = {}
    if "fullName" in user_data:
        update_fields["fullName"] = user_data["fullName"]
    if "email" in user_data:
        update_fields["email"] = user_data["email"]
    if "role" in user_data:
        update_fields["role"] = user_data["role"]
    if "phone" in user_data:
        update_fields["phone"] = user_data["phone"]
    if "yearOfBirth" in user_data:
        update_fields["yearOfBirth"] = user_data["yearOfBirth"]
    if "address" in user_data:
        update_fields["address"] = user_data["address"]
    
    # Handle password reset
    if "password" in user_data and user_data["password"]:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        update_fields["hashed_password"] = pwd_context.hash(user_data["password"])
    
    result = await db.users.update_one(
        {"_id": user_id},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "User updated successfully"}

# Platform Settings Routes
@router.get("/platform-settings")
async def get_platform_settings(
    superadmin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """Get platform-wide settings (Super Admin only)"""
    db = request.app.state.db
    
    settings = await db.platform_settings.find_one({"_id": "system"})
    
    if not settings:
        # Return default settings if none exist
        return {
            "siteName": "Serbian Cultural Association",
            "maintenanceMode": False,
            "timezone": "Europe/Stockholm",
            "security": {
                "minPasswordLength": 6,
                "requireUppercase": False,
                "requireNumbers": False,
                "sessionTimeout": 7200,
                "maxLoginAttempts": 5
            },
            "email": {
                "smtpHost": "",
                "smtpPort": 587,
                "smtpUser": "",
                "smtpPassword": "",
                "fromEmail": "",
                "fromName": ""
            },
            "notifications": {
                "emailEnabled": True,
                "smsEnabled": False,
                "notifyAdminOnNewUser": True,
                "notifyUserOnInvoice": True
            }
        }
    
    settings.pop("_id", None)
    return settings

@router.put("/platform-settings")
async def update_platform_settings(
    settings_data: dict,
    superadmin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """Update platform-wide settings (Super Admin only)"""
    db = request.app.state.db
    
    # Update or create settings
    await db.platform_settings.update_one(
        {"_id": "system"},
        {"$set": settings_data},
        upsert=True
    )
    
    return {"success": True, "message": "Platform settings updated successfully"}

# Branding Settings Routes
@router.get("/branding")
async def get_branding_settings(
    superadmin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """Get branding settings (Super Admin only)"""
    db = request.app.state.db
    
    settings = await db.branding_settings.find_one({"_id": "branding"})
    
    if not settings:
        # Return default branding settings if none exist
        return {
            "logo": "",
            "colors": {
                "primary": "#C1272D",
                "secondary": "#8B1F1F",
                "buttonPrimary": "#C1272D",
                "buttonHover": "#8B1F1F"
            },
            "language": {
                "default": "sr",
                "supported": ["sr", "en", "sv"]
            },
            "emailTemplates": {
                "welcome": {
                    "subject": "Welcome to SKUD Täby!",
                    "body": "Dear {userName},\n\nWelcome to Serbian Cultural Association (SKUD Täby)! We're excited to have you as a member.\n\nBest regards,\nSKUD Täby Team"
                },
                "invoice": {
                    "subject": "New Invoice from SKUD Täby",
                    "body": "Dear {userName},\n\nA new invoice has been generated for you.\n\nAmount: {amount} SEK\nDue Date: {dueDate}\n\nPlease log in to your account to view details.\n\nBest regards,\nSKUD Täby Team"
                },
                "passwordReset": {
                    "subject": "Password Reset Request - SKUD Täby",
                    "body": "Dear {userName},\n\nYou requested a password reset. Click the link below to reset your password:\n\n{resetLink}\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nSKUD Täby Team"
                },
                "eventRegistration": {
                    "subject": "Event Registration Confirmation - SKUD Täby",
                    "body": "Dear {userName},\n\nYou have successfully registered for: {eventName}\n\nDate: {eventDate}\nLocation: {eventLocation}\n\nWe look forward to seeing you!\n\nBest regards,\nSKUD Täby Team"
                }
            }
        }
    
    settings.pop("_id", None)
    return settings

@router.put("/branding")
async def update_branding_settings(
    settings_data: dict,
    superadmin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """Update branding settings (Super Admin only)"""
    db = request.app.state.db
    
    # Update or create branding settings
    await db.branding_settings.update_one(
        {"_id": "branding"},
        {"$set": settings_data},
        upsert=True
    )
    
    return {"success": True, "message": "Branding settings updated successfully"}

@router.post("/branding/logo")
async def upload_logo(
    file: UploadFile,
    superadmin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """Upload logo image (Super Admin only)"""
    from pathlib import Path
    import shutil
    
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PNG, JPG, and SVG are allowed.")
    
    # Create branding upload directory
    upload_dir = Path("/app/backend/uploads/branding")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file with a fixed name (logo with extension)
    file_extension = file.filename.split(".")[-1]
    file_path = upload_dir / f"logo.{file_extension}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update branding settings with logo path
    db = request.app.state.db
    logo_url = f"/uploads/branding/logo.{file_extension}"
    
    await db.branding_settings.update_one(
        {"_id": "branding"},
        {"$set": {"logo": logo_url}},
        upsert=True
    )
    
    return {"success": True, "logo": logo_url}