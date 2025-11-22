from fastapi import APIRouter, HTTPException, status, Depends, Request
from datetime import datetime
import os

from models import UserCreate, LoginRequest, RegisterResponse, UserResponse
from auth_utils import hash_password, verify_password, create_access_token, generate_verification_token
from email_service import send_email, get_verification_email_template
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
    verification_link = f"{backend_url}/api/auth/verify-email?token={verification_token}"
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