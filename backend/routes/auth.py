from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.responses import JSONResponse
from datetime import timezone
import httpx
from datetime import datetime, timedelta
import os

from models import UserCreate, LoginRequest, RegisterResponse, UserResponse
from auth_utils import hash_password, verify_password, create_access_token, generate_verification_token
from email_service import send_email, get_verification_email_template, get_admin_new_user_notification_template
from dependencies import get_db

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
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
    # Use frontend URL for verification link
    frontend_url = backend_url.replace('/api', '')
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
    )
    
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
        )
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
    user = await db.users.find_one({"username": login_data.username})
    
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
        createdAt=user["createdAt"]
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
    
    # Send reset email
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
    reset_link = f"{backend_url.replace('/api', '')}/reset-password?token={reset_token}"
    
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
    )
    
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
    


# ==================== Emergent Auth Google OAuth ====================

@router.post("/session")
async def create_session_from_google(request: Request):
    """Handle Google OAuth callback - Process session_id and create local session"""
    db = request.app.state.db
    
    # Get session_id from header
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID header")
    
    # Call Emergent Auth API to get user data
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            response.raise_for_status()
            auth_data = response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=400, detail=f"Failed to get session data: {str(e)}")
    
    # Extract user data from Emergent Auth response
    user_email = auth_data.get("email")
    user_name = auth_data.get("name")
    user_picture = auth_data.get("picture")
    session_token = auth_data.get("session_token")
    
    if not all([user_email, session_token]):
        raise HTTPException(status_code=400, detail="Invalid session data")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_email})
    
    if existing_user:
        user_id = existing_user["_id"]
    else:
        # Create new user
        user_id = f"user_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        new_user = {
            "_id": user_id,
            "email": user_email,
            "fullName": user_name or user_email.split('@')[0],
            "username": user_email,
            "picture": user_picture,
            "role": "user",
            "emailVerified": True,  # Google OAuth means email is verified
            "createdAt": datetime.now(timezone.utc),
            "googleAuth": True
        }
        await db.users.insert_one(new_user)
    
    # Store session in database
    session_expiry = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": session_expiry,
        "created_at": datetime.now(timezone.utc)
    }
    
    # Remove any existing sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.user_sessions.insert_one(session_doc)
    
    # Set httpOnly cookie
    response = JSONResponse({
        "success": True,
        "user": {
            "id": user_id,
            "email": user_email,
            "fullName": user_name,
            "picture": user_picture
        }
    })
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60  # 7 days
    )
    
    return response

@router.get("/me")
async def get_current_user(request: Request):
    """Get current user from session token"""
    db = request.app.state.db
    
    # Try to get session_token from cookie first, then Authorization header
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session in database
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check if session expired
    if session["expires_at"] < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": session_token})
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user data
    user = await db.users.find_one({"_id": session["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Return user data (excluding sensitive fields)
    return {
        "id": user["_id"],
        "email": user.get("email"),
        "fullName": user.get("fullName"),
        "username": user.get("username"),
        "picture": user.get("picture"),
        "role": user.get("role", "user"),
        "phone": user.get("phone"),
        "address": user.get("address"),
        "yearOfBirth": user.get("yearOfBirth"),
        "parentName": user.get("parentName"),
        "parentEmail": user.get("parentEmail"),
        "parentPhone": user.get("parentPhone")
    }

@router.post("/logout")
async def logout(request: Request):
    """Logout user - delete session and clear cookie"""
    db = request.app.state.db
    
    # Get session_token from cookie or header
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if session_token:
        # Delete session from database
        await db.user_sessions.delete_one({"session_token": session_token})
    
    # Clear cookie
    response = JSONResponse({"success": True, "message": "Logged out successfully"})
    response.delete_cookie(key="session_token", path="/")
    
    return response

    return {"success": True, "message": "Password reset successfully"}