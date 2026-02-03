from fastapi import APIRouter, HTTPException, status, Request
from datetime import datetime, timedelta
import os
import logging

from models import UserCreate, LoginRequest, RegisterResponse, UserResponse
from auth_utils import hash_password, verify_password, create_access_token, generate_verification_token
from email_service import send_email, get_verification_email_template, get_admin_new_user_notification_template
from dependencies import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/register", response_model=RegisterResponse)
async def register(user_data: UserCreate, request: Request):
    """Register a new user"""
    db = request.app.state.db
    
    # Check if username or email already exists
    existing = await db.users.find_one({
        "$or": [
            {"username": user_data.username},
            {"email": user_data.email}
        ]
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Create user
    verification_token = generate_verification_token()
    user_dict = user_data.dict(exclude={"password"})
    user_dict.update({
        "_id": f"user_{int(datetime.utcnow().timestamp() * 1000)}",
        "hashed_password": hash_password(user_data.password),
        "role": "user",
        "emailVerified": False,
        "verificationToken": verification_token,
        "createdAt": datetime.utcnow()
    })
    
    await db.users.insert_one(user_dict)
    user_id = user_dict["_id"]
    
    # Send verification email
    # Get frontend URL from environment or use production URL
    frontend_url = os.environ.get('FRONTEND_URL', 'https://cultural-cms-1.preview.emergentagent.com')
    verification_link = f"{frontend_url}/verify-email?token={verification_token}"
    html_content, text_content = get_verification_email_template(
        user_data.fullName,
        verification_link
    )
    
    await send_email(
        user_data.email,
        "Verifikacija email adrese / E-postverifiering - SKUD Täby",
        html_content,
        text_content
    , db=request.app.state.db)
    
    # Send admin notification email
    admin_email = "info@srpskoudruzenjetaby.se"
    registration_date = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    admin_html, admin_text = get_admin_new_user_notification_template(
        user_data.fullName,
        user_data.email,
        registration_date
    )
    
    # Send to admin (don't block registration if this fails)
    try:
        await send_email(
            admin_email,
            "Nova Registracija / Ny Registrering - SKUD Täby",
            admin_html,
            admin_text
        , db=request.app.state.db)
    except Exception as e:
        logger.error(f"Failed to send admin notification: {str(e)}")
    
    return RegisterResponse(
        success=True,
        message="Registration successful. Please check your email for verification.",
        userId=user_id
    )

@router.post("/login")
async def login(login_data: LoginRequest, request: Request):
    """Login user and return JWT token"""
    db = request.app.state.db
    # Check both username and email fields
    user = await db.users.find_one({
        "$or": [
            {"username": login_data.username},
            {"email": login_data.username}
        ]
    })
    
    if not user or not verify_password(login_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Create access token
    token = create_access_token(data={"sub": user["_id"], "role": user["role"]})
    
    # Prepare user response
    user_response = UserResponse(
        id=str(user["_id"]),
        username=user["username"],
        email=user["email"],
        fullName=user["fullName"],
        phone=user.get("phone"),
        yearOfBirth=user.get("yearOfBirth"),
        address=user.get("address"),
        role=user["role"],
        emailVerified=user.get("emailVerified", False),
        createdAt=user["createdAt"],
        parentName=user.get("parentName"),
        parentEmail=user.get("parentEmail"),
        parentPhone=user.get("parentPhone")
    )
    
    return {
        "success": True,
        "token": token,
        "user": user_response
    }

@router.get("/verify-email")
async def verify_email(token: str, request: Request):
    """Verify user email address"""
    db = request.app.state.db
    user = await db.users.find_one({"verificationToken": token})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"emailVerified": True}, "$unset": {"verificationToken": ""}}
    )
    
    return {"success": True, "message": "Email verified successfully"}

@router.post("/forgot-password")
async def forgot_password(email: str, request: Request):
    """Send password reset email"""
    db = request.app.state.db
    user = await db.users.find_one({"email": email})
    
    if not user:
        # Don't reveal if email exists
        return {"success": True, "message": "If email exists, reset instructions sent"}
    
    # Generate reset token
    reset_token = generate_verification_token()
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"resetToken": reset_token, "resetTokenExpiry": datetime.utcnow() + timedelta(hours=1)}}
    )
    
    # Send reset email - use FRONTEND_URL for the reset link
    frontend_url = os.environ.get('FRONTEND_URL', 'https://srpskoudruzenjetaby.se')
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    html = f"""
    <html>
    <body style="font-family: Arial, sans-serif;">
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <p><a href="{reset_link}" style="background: #C1272D; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
    </body>
    </html>
    """
    
    await send_email(
        user["email"],
        "Password Reset - SKUD Täby",
        html,
        f"Reset your password: {reset_link}"
    , db=request.app.state.db)
    
    return {"success": True, "message": "If email exists, reset instructions sent"}

@router.post("/reset-password")
async def reset_password(token: str, new_password: str, request: Request):
    """Reset password with token"""
    db = request.app.state.db
    user = await db.users.find_one({
        "resetToken": token,
        "resetTokenExpiry": {"$gt": datetime.utcnow()}
    })
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update password
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"hashed_password": hash_password(new_password)},
            "$unset": {"resetToken": "", "resetTokenExpiry": ""}
        }
    )
    
    return {"success": True, "message": "Password reset successfully"}