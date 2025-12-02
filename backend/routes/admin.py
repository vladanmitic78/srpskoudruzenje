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
    
    try:
        cursor = db.users.find({})
        users_list = await cursor.to_list(length=1000)
        
        # Remove sensitive data and convert _id to id
        for user in users_list:
            user.pop("hashed_password", None)
            user.pop("verificationToken", None)
            user.pop("resetToken", None)
            user.pop("resetTokenExpiry", None)
            # Keep the _id as id for frontend
            user["id"] = str(user.get("_id", ""))
            if "_id" in user:
                del user["_id"]
        
        return {"users": users_list, "total": len(users_list)}
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        return {"users": [], "total": 0}

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

# Role Permissions Routes
@router.get("/permissions")
async def get_permissions(
    superadmin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """Get role permissions (Super Admin only)"""
    db = request.app.state.db
    
    permissions = await db.role_permissions.find_one({"_id": "permissions"})
    
    if not permissions:
        # Return default permissions if none exist
        return {
            "admin": {
                "viewMembers": True,
                "manageEvents": True,
                "manageInvoices": True,
                "manageContent": True,
                "manageGallery": True,
                "manageSettings": True,
                "manageUsers": False,
                "accessDashboard": True
            },
            "moderator": {
                "viewMembers": False,
                "manageEvents": True,
                "manageInvoices": False,
                "manageContent": True,
                "manageGallery": True,
                "manageSettings": False,
                "manageUsers": False,
                "accessDashboard": True
            },
            "user": {
                "viewMembers": False,
                "manageEvents": False,
                "manageInvoices": False,
                "manageContent": False,
                "manageGallery": False,
                "manageSettings": False,
                "manageUsers": False,
                "accessDashboard": False
            }
        }
    
    permissions.pop("_id", None)
    return permissions

@router.put("/permissions")
async def update_permissions(
    permissions_data: dict,
    superadmin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """Update role permissions (Super Admin only)"""
    db = request.app.state.db
    
    # Update or create permissions
    await db.role_permissions.update_one(
        {"_id": "permissions"},
        {"$set": permissions_data},
        upsert=True
    )
    
    return {"success": True, "message": "Permissions updated successfully"}


@router.post("/test-event-reminders")
async def test_event_reminders(
    admin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """
    Test endpoint to manually trigger event reminder emails
    (Super Admin only - for testing purposes)
    """
    from scheduler import send_event_reminders
    
    db = request.app.state.db
    
    try:
        # Run the reminder job
        await send_event_reminders(db)
        return {
            "success": True,
            "message": "Event reminder job executed. Check server logs for details."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing reminder job: {str(e)}")



# ==================== Phase 5.1: Admin Management ====================

@router.get("/admins")
async def get_all_admins(
    admin: dict = Depends(get_superadmin_user),
    request: Request = None,
    role: str = None
):
    """
    Get list of all admin users (Super Admin only)
    Can filter by role (admin, moderator)
    """
    db = request.app.state.db
    
    try:
        # Build query
        query = {"role": {"$in": ["admin", "moderator", "superadmin"]}}
        
        if role and role in ["admin", "moderator"]:
            query["role"] = role
        
        # Fetch admins
        cursor = db.users.find(query, {
            "_id": 0,
            "id": 1,
            "email": 1,
            "fullName": 1,
            "role": 1,
            "emailVerified": 1,
            "createdAt": 1,
            "lastActive": 1,
            "status": 1
        }).sort("createdAt", -1)
        
        admins = await cursor.to_list(length=100)
        
        return {
            "success": True,
            "admins": admins,
            "total": len(admins)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch admins: {str(e)}")


@router.post("/admins/create")
async def create_admin_account(
    admin_data: dict,
    admin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """
    Create new admin or moderator account (Super Admin only)
    Sends invitation email with temporary password
    """
    from auth_utils import hash_password
    from email_service import send_email, get_admin_invitation_template
    from activity_logger import log_admin_activity
    import secrets
    import string
    
    db = request.app.state.db
    
    try:
        # Validate required fields
        required_fields = ["email", "fullName", "role"]
        for field in required_fields:
            if field not in admin_data:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Validate role
        if admin_data["role"] not in ["admin", "moderator"]:
            raise HTTPException(status_code=400, detail="Role must be 'admin' or 'moderator'")
        
        # Check if email already exists
        existing_user = await db.users.find_one({"email": admin_data["email"]})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Generate temporary password
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        
        # Create new admin user
        from uuid import uuid4
        new_admin = {
            "id": str(uuid4()),
            "email": admin_data["email"],
            "username": admin_data["email"],
            "fullName": admin_data["fullName"],
            "role": admin_data["role"],
            "hashed_password": hash_password(temp_password),
            "emailVerified": True,
            "status": "active",
            "createdAt": datetime.utcnow(),
            "createdBy": admin["_id"]
        }
        
        # Insert into database
        await db.users.insert_one(new_admin)
        
        # Send invitation email
        html_content, text_content = get_admin_invitation_template(
            name=admin_data["fullName"],
            email=admin_data["email"],
            role=admin_data["role"].capitalize(),
            temporary_password=temp_password
        )
        
        await send_email(
            to_email=admin_data["email"],
            subject="Admin Account Created - Srpsko Kulturno Društvo Täby",
            html_content=html_content,
            text_content=text_content
        )
        
        # Log activity
        await log_admin_activity(
            db=db,
            admin_id=admin["_id"],
            admin_name=admin.get("fullName", admin.get("email")),
            action="create",
            target_type="admin_user",
            target_id=new_admin["id"],
            details={
                "email": admin_data["email"],
                "role": admin_data["role"],
                "fullName": admin_data["fullName"]
            }
        )
        
        return {
            "success": True,
            "message": "Admin account created and invitation email sent",
            "admin": {
                "id": new_admin["id"],
                "email": new_admin["email"],
                "fullName": new_admin["fullName"],
                "role": new_admin["role"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create admin account: {str(e)}")


@router.put("/admins/{admin_id}")
async def update_admin_account(
    admin_id: str,
    update_data: dict,
    admin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """
    Update admin account details (Super Admin only)
    Can change role, status, profile information
    """
    from activity_logger import log_admin_activity
    
    db = request.app.state.db
    
    try:
        # Prevent self-edit for critical fields
        if admin_id == admin["_id"] and "role" in update_data:
            raise HTTPException(status_code=400, detail="Cannot change your own role")
        
        # Fetch existing admin
        existing_admin = await db.users.find_one({"id": admin_id}, {"_id": 0})
        if not existing_admin:
            raise HTTPException(status_code=404, detail="Admin not found")
        
        # Prevent modifying super admin accounts
        if existing_admin["role"] == "superadmin":
            raise HTTPException(status_code=403, detail="Cannot modify Super Admin accounts")
        
        # Validate role if changing
        if "role" in update_data and update_data["role"] not in ["admin", "moderator"]:
            raise HTTPException(status_code=400, detail="Role must be 'admin' or 'moderator'")
        
        # Build update document
        allowed_fields = ["fullName", "role", "status", "phone"]
        update_doc = {k: v for k, v in update_data.items() if k in allowed_fields}
        update_doc["updatedAt"] = datetime.utcnow()
        
        # Update database
        await db.users.update_one(
            {"id": admin_id},
            {"$set": update_doc}
        )
        
        # Log activity
        await log_admin_activity(
            db=db,
            admin_id=admin["_id"],
            admin_name=admin.get("fullName", admin.get("email")),
            action="edit",
            target_type="admin_user",
            target_id=admin_id,
            details={
                "changes": update_doc,
                "adminEmail": existing_admin["email"]
            }
        )
        
        return {
            "success": True,
            "message": "Admin account updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update admin account: {str(e)}")


@router.post("/admins/{admin_id}/reset-password")
async def reset_admin_password(
    admin_id: str,
    admin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """
    Reset admin password and send new temporary password (Super Admin only)
    """
    from auth_utils import hash_password
    from email_service import send_email
    from activity_logger import log_admin_activity
    import secrets
    import string
    
    db = request.app.state.db
    
    try:
        # Fetch admin
        target_admin = await db.users.find_one({"id": admin_id}, {"_id": 0})
        if not target_admin:
            raise HTTPException(status_code=404, detail="Admin not found")
        
        # Prevent resetting super admin passwords
        if target_admin["role"] == "superadmin":
            raise HTTPException(status_code=403, detail="Cannot reset Super Admin password")
        
        # Generate new temporary password
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        
        # Update password
        await db.users.update_one(
            {"id": admin_id},
            {"$set": {
                "hashed_password": hash_password(temp_password),
                "updatedAt": datetime.utcnow()
            }}
        )
        
        # Send email with new password
        html_content = f"""
        <h2>Password Reset - Srpsko Kulturno Društvo Täby</h2>
        <p>Your password has been reset by a Super Administrator.</p>
        <p><strong>New Temporary Password:</strong> {temp_password}</p>
        <p><strong>⚠️ Important:</strong> Please change this password after logging in.</p>
        <p><a href="http://localhost:3000/login">Login Here</a></p>
        """
        
        text_content = f"""
        Password Reset - Srpsko Kulturno Društvo Täby
        
        Your password has been reset by a Super Administrator.
        
        New Temporary Password: {temp_password}
        
        ⚠️ Important: Please change this password after logging in.
        
        Login: http://localhost:3000/login
        """
        
        await send_email(
            to_email=target_admin["email"],
            subject="Password Reset - Admin Account",
            html_content=html_content,
            text_content=text_content
        )
        
        # Log activity
        await log_admin_activity(
            db=db,
            admin_id=admin["_id"],
            admin_name=admin.get("fullName", admin.get("email")),
            action="reset_password",
            target_type="admin_user",
            target_id=admin_id,
            details={"adminEmail": target_admin["email"]}
        )
        
        return {
            "success": True,
            "message": "Password reset successfully. Email sent to admin."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset password: {str(e)}")


@router.delete("/admins/{admin_id}")
async def delete_admin_account(
    admin_id: str,
    admin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """
    Delete admin account (Super Admin only)
    Cannot delete yourself or other Super Admins
    """
    from activity_logger import log_admin_activity
    
    db = request.app.state.db
    
    try:
        # Prevent self-delete
        if admin_id == admin["_id"]:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        # Fetch admin to delete
        target_admin = await db.users.find_one({"id": admin_id}, {"_id": 0})
        if not target_admin:
            raise HTTPException(status_code=404, detail="Admin not found")
        
        # Prevent deleting super admins
        if target_admin["role"] == "superadmin":
            raise HTTPException(status_code=403, detail="Cannot delete Super Admin accounts")
        
        # Delete admin
        await db.users.delete_one({"id": admin_id})
        
        # Log activity
        await log_admin_activity(
            db=db,
            admin_id=admin["_id"],
            admin_name=admin.get("fullName", admin.get("email")),
            action="delete",
            target_type="admin_user",
            target_id=admin_id,
            details={
                "deletedEmail": target_admin["email"],
                "deletedRole": target_admin["role"],
                "deletedName": target_admin.get("fullName")
            }
        )
        
        return {
            "success": True,
            "message": "Admin account deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete admin account: {str(e)}")


    return {"success": True, "message": "Permissions updated successfully"}