from fastapi import APIRouter, Depends, Request
from models import UserResponse, UserUpdate, MembershipCancellation
from dependencies import get_current_user
from email_service import send_email
from datetime import datetime

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return UserResponse(
        id=str(current_user["_id"]),
        username=current_user["username"],
        email=current_user["email"],
        fullName=current_user["fullName"],
        phone=current_user.get("phone"),
        yearOfBirth=current_user.get("yearOfBirth"),
        address=current_user.get("address"),
        parentName=current_user.get("parentName"),
        parentEmail=current_user.get("parentEmail"),
        parentPhone=current_user.get("parentPhone"),
        role=current_user["role"],
        emailVerified=current_user.get("emailVerified", False),
        createdAt=current_user["createdAt"]
    )

@router.put("/me")
async def update_user_profile(
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """Update current user profile"""
    db = request.app.state.db
    update_data = user_update.dict(exclude_unset=True)
    
    if update_data:
        await db.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": update_data}
        )
    
    # Get updated user data
    updated_user = await db.users.find_one({"_id": current_user["_id"]})
    
    return {
        "success": True, 
        "message": "Profile updated successfully",
        "user": {
            "id": updated_user["_id"],
            "email": updated_user.get("email"),
            "fullName": updated_user.get("fullName"),
            "username": updated_user.get("username"),
            "role": updated_user.get("role", "user"),
            "phone": updated_user.get("phone"),
            "address": updated_user.get("address"),
            "yearOfBirth": updated_user.get("yearOfBirth"),
            "parentName": updated_user.get("parentName"),
            "parentEmail": updated_user.get("parentEmail"),
            "parentPhone": updated_user.get("parentPhone")
        }
    }

@router.post("/cancel-membership")
async def cancel_membership(
    cancellation: MembershipCancellation,
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """Request membership cancellation"""
    db = request.app.state.db
    
    # Store cancellation request
    await db.cancellation_requests.insert_one({
        "userId": current_user["_id"],
        "userEmail": current_user["email"],
        "fullName": current_user["fullName"],
        "reason": cancellation.reason,
        "requestedAt": datetime.utcnow()
    })
    
    # Notify admin via email
    html = f"<p>User {current_user['fullName']} ({current_user['email']}) has requested membership cancellation.</p><p>Reason: {cancellation.reason}</p>"
    await send_email(
        "info@srpskoudruzenjetaby.se",
        "Membership Cancellation Request",
        html,
        f"Cancellation request from {current_user['fullName']}: {cancellation.reason}"
    )
    
    return {"success": True, "message": "Membership cancellation request submitted"}