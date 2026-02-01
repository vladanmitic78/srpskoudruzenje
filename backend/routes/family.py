from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime
from uuid import uuid4
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from dependencies import get_current_user, get_admin_user
from auth_utils import hash_password

router = APIRouter()

# Pydantic models for family members
class FamilyMemberCreate(BaseModel):
    fullName: str
    email: Optional[str] = None  # Optional for children under 18
    yearOfBirth: str
    phone: Optional[str] = None
    address: Optional[str] = None
    trainingGroup: Optional[str] = None
    relationship: str = "child"  # child, friend, spouse, other

class FamilyMemberUpdate(BaseModel):
    fullName: Optional[str] = None
    email: Optional[EmailStr] = None
    yearOfBirth: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    trainingGroup: Optional[str] = None
    relationship: Optional[str] = None

class FamilyMemberResponse(BaseModel):
    id: str
    fullName: str
    email: str
    yearOfBirth: str
    phone: Optional[str] = None
    address: Optional[str] = None
    trainingGroup: Optional[str] = None
    relationship: str
    primaryAccountId: str
    createdAt: datetime

def calculate_age(year_of_birth: str) -> int:
    """Calculate age from year of birth"""
    try:
        current_year = datetime.now().year
        return current_year - int(year_of_birth)
    except:
        return 0

@router.post("/members")
async def add_family_member(
    member_data: FamilyMemberCreate,
    user: dict = Depends(get_current_user),
    request: Request = None
):
    """
    Add a family member (child/friend) to the current user's account.
    Only users 18+ can add family members.
    """
    db = request.app.state.db
    
    # Check if user is 18+
    user_age = calculate_age(user.get("yearOfBirth", ""))
    if user_age < 18:
        raise HTTPException(
            status_code=403, 
            detail="You must be 18 or older to add family members"
        )
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": member_data.email})
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="A user with this email already exists"
        )
    
    # Generate a temporary password for the new member
    import secrets
    import string
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
    
    # Create the family member user
    member_id = str(uuid4())
    new_member = {
        "id": member_id,
        "_id": member_id,
        "email": member_data.email,
        "username": member_data.email,  # Use email as username
        "fullName": member_data.fullName,
        "yearOfBirth": member_data.yearOfBirth,
        "phone": member_data.phone,
        "address": member_data.address or user.get("address", ""),
        "trainingGroup": member_data.trainingGroup,
        "role": "user",
        "emailVerified": True,  # Family members are pre-verified
        "hashed_password": hash_password(temp_password),
        "primaryAccountId": user["_id"],  # Link to parent account
        "relationship": member_data.relationship,
        "dependentMembers": [],
        "createdAt": datetime.utcnow(),
        "createdBy": user["_id"]
    }
    
    # Insert the new member
    await db.users.insert_one(new_member)
    
    # Update the parent user's dependentMembers list
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$push": {"dependentMembers": member_id}}
    )
    
    # Send welcome email with credentials
    try:
        from email_service import send_email
        
        html_content = f"""
        <h2>Welcome to Srpsko Kulturno Društvo Täby!</h2>
        <p>Dear {member_data.fullName},</p>
        <p>You have been added as a family member by {user.get('fullName', 'your family member')}.</p>
        <p>You can now log in to your own account using the following credentials:</p>
        <p><strong>Email:</strong> {member_data.email}</p>
        <p><strong>Temporary Password:</strong> {temp_password}</p>
        <p><strong>⚠️ Important:</strong> Please change your password after your first login.</p>
        <p><a href="{request.base_url}login">Login Here</a></p>
        <br>
        <p>Best regards,<br>SKUD Täby Team</p>
        """
        
        text_content = f"""
        Welcome to Srpsko Kulturno Društvo Täby!
        
        Dear {member_data.fullName},
        
        You have been added as a family member by {user.get('fullName', 'your family member')}.
        
        You can now log in to your own account:
        Email: {member_data.email}
        Temporary Password: {temp_password}
        
        ⚠️ Important: Please change your password after your first login.
        
        Best regards,
        SKUD Täby Team
        """
        
        await send_email(
            to_email=member_data.email,
            subject="Welcome to SKUD Täby - Your Account Has Been Created",
            html_content=html_content,
            text_content=text_content,
            db=db
        )
    except Exception as e:
        print(f"Failed to send welcome email: {e}")
        # Don't fail the request if email fails
    
    # Return the created member (without sensitive data)
    return {
        "success": True,
        "message": f"Family member added successfully. Login credentials sent to {member_data.email}",
        "member": {
            "id": member_id,
            "fullName": member_data.fullName,
            "email": member_data.email,
            "yearOfBirth": member_data.yearOfBirth,
            "relationship": member_data.relationship,
            "primaryAccountId": user["_id"]
        }
    }


@router.get("/members")
async def get_family_members(
    user: dict = Depends(get_current_user),
    request: Request = None
):
    """
    Get all family members linked to the current user's account.
    """
    db = request.app.state.db
    
    # Get the list of dependent member IDs
    dependent_ids = user.get("dependentMembers", [])
    
    if not dependent_ids:
        return {"members": [], "total": 0}
    
    # Fetch all family members
    members = await db.users.find(
        {"_id": {"$in": dependent_ids}},
        {
            "_id": 0,
            "id": 1,
            "fullName": 1,
            "email": 1,
            "yearOfBirth": 1,
            "phone": 1,
            "address": 1,
            "trainingGroup": 1,
            "relationship": 1,
            "primaryAccountId": 1,
            "createdAt": 1
        }
    ).to_list(length=100)
    
    return {
        "members": members,
        "total": len(members)
    }


@router.get("/members/{member_id}")
async def get_family_member(
    member_id: str,
    user: dict = Depends(get_current_user),
    request: Request = None
):
    """
    Get details of a specific family member.
    """
    db = request.app.state.db
    
    # Verify the member belongs to this user
    dependent_ids = user.get("dependentMembers", [])
    if member_id not in dependent_ids:
        raise HTTPException(status_code=404, detail="Family member not found")
    
    member = await db.users.find_one(
        {"_id": member_id},
        {
            "_id": 0,
            "id": 1,
            "fullName": 1,
            "email": 1,
            "yearOfBirth": 1,
            "phone": 1,
            "address": 1,
            "trainingGroup": 1,
            "relationship": 1,
            "primaryAccountId": 1,
            "createdAt": 1
        }
    )
    
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")
    
    return {"member": member}


@router.put("/members/{member_id}")
async def update_family_member(
    member_id: str,
    update_data: FamilyMemberUpdate,
    user: dict = Depends(get_current_user),
    request: Request = None
):
    """
    Update a family member's information.
    """
    db = request.app.state.db
    
    # Verify the member belongs to this user
    dependent_ids = user.get("dependentMembers", [])
    if member_id not in dependent_ids:
        raise HTTPException(status_code=404, detail="Family member not found")
    
    # Build update document
    update_doc = {}
    if update_data.fullName is not None:
        update_doc["fullName"] = update_data.fullName
    if update_data.email is not None:
        # Check if new email already exists
        existing = await db.users.find_one({
            "email": update_data.email,
            "_id": {"$ne": member_id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_doc["email"] = update_data.email
        update_doc["username"] = update_data.email
    if update_data.yearOfBirth is not None:
        update_doc["yearOfBirth"] = update_data.yearOfBirth
    if update_data.phone is not None:
        update_doc["phone"] = update_data.phone
    if update_data.address is not None:
        update_doc["address"] = update_data.address
    if update_data.trainingGroup is not None:
        update_doc["trainingGroup"] = update_data.trainingGroup
    if update_data.relationship is not None:
        update_doc["relationship"] = update_data.relationship
    
    if not update_doc:
        return {"success": True, "message": "No changes to update"}
    
    update_doc["updatedAt"] = datetime.utcnow()
    
    await db.users.update_one(
        {"_id": member_id},
        {"$set": update_doc}
    )
    
    return {"success": True, "message": "Family member updated successfully"}


@router.delete("/members/{member_id}")
async def remove_family_member(
    member_id: str,
    user: dict = Depends(get_current_user),
    request: Request = None
):
    """
    Remove a family member from the current user's account.
    Note: This removes the link but does not delete the member's account.
    """
    db = request.app.state.db
    
    # Verify the member belongs to this user
    dependent_ids = user.get("dependentMembers", [])
    if member_id not in dependent_ids:
        raise HTTPException(status_code=404, detail="Family member not found")
    
    # Remove from parent's dependentMembers list
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$pull": {"dependentMembers": member_id}}
    )
    
    # Clear the member's primaryAccountId (they become independent)
    await db.users.update_one(
        {"_id": member_id},
        {"$unset": {"primaryAccountId": "", "relationship": ""}}
    )
    
    return {
        "success": True, 
        "message": "Family member removed from your account. They can still access their own account."
    }


# ==================== Admin Routes ====================

@router.get("/admin/all")
async def admin_get_all_family_relationships(
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """
    Get all users with their family relationships (Admin only).
    """
    db = request.app.state.db
    
    # Get all users who have dependents (primary account holders)
    primary_users = await db.users.find(
        {"dependentMembers": {"$exists": True, "$ne": []}},
        {
            "_id": 0,
            "id": 1,
            "fullName": 1,
            "email": 1,
            "dependentMembers": 1
        }
    ).to_list(length=1000)
    
    # Enrich with dependent details
    for user in primary_users:
        dependent_ids = user.get("dependentMembers", [])
        if dependent_ids:
            dependents = await db.users.find(
                {"_id": {"$in": dependent_ids}},
                {
                    "_id": 0,
                    "id": 1,
                    "fullName": 1,
                    "email": 1,
                    "relationship": 1,
                    "yearOfBirth": 1
                }
            ).to_list(length=100)
            user["familyMembers"] = dependents
    
    return {
        "families": primary_users,
        "total": len(primary_users)
    }


@router.post("/admin/members/{user_id}")
async def admin_add_family_member(
    user_id: str,
    member_data: FamilyMemberCreate,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """
    Add a family member to any user's account (Admin only).
    """
    db = request.app.state.db
    
    # Find the parent user
    parent_user = await db.users.find_one({"_id": user_id})
    if not parent_user:
        # Try with id field
        parent_user = await db.users.find_one({"id": user_id})
    
    if not parent_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": member_data.email})
    if existing_user:
        raise HTTPException(
            status_code=400, 
            detail="A user with this email already exists"
        )
    
    # Generate a temporary password
    import secrets
    import string
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
    
    # Create the family member user
    member_id = str(uuid4())
    parent_id = parent_user.get("_id") or parent_user.get("id")
    
    new_member = {
        "id": member_id,
        "_id": member_id,
        "email": member_data.email,
        "username": member_data.email,
        "fullName": member_data.fullName,
        "yearOfBirth": member_data.yearOfBirth,
        "phone": member_data.phone,
        "address": member_data.address or parent_user.get("address", ""),
        "trainingGroup": member_data.trainingGroup,
        "role": "user",
        "emailVerified": True,
        "hashed_password": hash_password(temp_password),
        "primaryAccountId": parent_id,
        "relationship": member_data.relationship,
        "dependentMembers": [],
        "createdAt": datetime.utcnow(),
        "createdBy": admin.get("_id") or admin.get("id")
    }
    
    # Insert the new member
    await db.users.insert_one(new_member)
    
    # Update the parent user's dependentMembers list
    await db.users.update_one(
        {"_id": parent_id},
        {"$push": {"dependentMembers": member_id}}
    )
    
    # Send welcome email
    try:
        from email_service import send_email
        
        html_content = f"""
        <h2>Welcome to Srpsko Kulturno Društvo Täby!</h2>
        <p>Dear {member_data.fullName},</p>
        <p>An administrator has created an account for you as a family member of {parent_user.get('fullName', 'another member')}.</p>
        <p>You can now log in using:</p>
        <p><strong>Email:</strong> {member_data.email}</p>
        <p><strong>Temporary Password:</strong> {temp_password}</p>
        <p><strong>⚠️ Important:</strong> Please change your password after your first login.</p>
        <br>
        <p>Best regards,<br>SKUD Täby Team</p>
        """
        
        text_content = f"""
        Welcome to Srpsko Kulturno Društvo Täby!
        
        Dear {member_data.fullName},
        
        An administrator has created an account for you as a family member of {parent_user.get('fullName', 'another member')}.
        
        Email: {member_data.email}
        Temporary Password: {temp_password}
        
        ⚠️ Important: Please change your password after your first login.
        
        Best regards,
        SKUD Täby Team
        """
        
        await send_email(
            to_email=member_data.email,
            subject="Welcome to SKUD Täby - Your Account Has Been Created",
            html_content=html_content,
            text_content=text_content,
            db=db
        )
    except Exception as e:
        print(f"Failed to send welcome email: {e}")
    
    return {
        "success": True,
        "message": f"Family member added successfully. Login credentials sent to {member_data.email}",
        "member": {
            "id": member_id,
            "fullName": member_data.fullName,
            "email": member_data.email,
            "yearOfBirth": member_data.yearOfBirth,
            "relationship": member_data.relationship,
            "primaryAccountId": parent_id
        }
    }


@router.delete("/admin/members/{member_id}")
async def admin_remove_family_member(
    member_id: str,
    delete_account: bool = False,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """
    Remove a family member relationship (Admin only).
    Optionally delete the member's account entirely.
    """
    db = request.app.state.db
    
    # Find the member
    member = await db.users.find_one({"_id": member_id})
    if not member:
        member = await db.users.find_one({"id": member_id})
    
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    primary_account_id = member.get("primaryAccountId")
    
    if primary_account_id:
        # Remove from parent's dependentMembers list
        await db.users.update_one(
            {"_id": primary_account_id},
            {"$pull": {"dependentMembers": member_id}}
        )
    
    if delete_account:
        # Delete the member account entirely
        await db.users.delete_one({"_id": member_id})
        # Also clean up with id field
        await db.users.delete_one({"id": member_id})
        return {"success": True, "message": "Family member account deleted"}
    else:
        # Just remove the relationship
        await db.users.update_one(
            {"_id": member_id},
            {"$unset": {"primaryAccountId": "", "relationship": ""}}
        )
        return {"success": True, "message": "Family relationship removed"}
