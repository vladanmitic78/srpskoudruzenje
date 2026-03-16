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
    photoConsent: Optional[bool] = None  # Required for minors - parent allows photos to be published

class FamilyMemberUpdate(BaseModel):
    fullName: Optional[str] = None
    email: Optional[EmailStr] = None
    yearOfBirth: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    trainingGroup: Optional[str] = None
    relationship: Optional[str] = None
    photoConsent: Optional[bool] = None  # Photo consent can be updated

class FamilyMemberResponse(BaseModel):
    id: str
    fullName: str
    email: Optional[str] = None  # Optional for children
    yearOfBirth: str
    phone: Optional[str] = None
    address: Optional[str] = None
    trainingGroup: Optional[str] = None
    relationship: str
    primaryAccountId: str
    parentEmail: Optional[str] = None  # Parent's email for notifications
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
    Email is optional for children under 18 - notifications go to parent's email.
    """
    db = request.app.state.db
    
    # Check if user is 18+
    user_age = calculate_age(user.get("yearOfBirth", ""))
    if user_age < 18:
        raise HTTPException(
            status_code=403, 
            detail="You must be 18 or older to add family members"
        )
    
    # Calculate member's age
    member_age = calculate_age(member_data.yearOfBirth)
    
    # Email is required only for members 18+
    member_email = member_data.email
    use_parent_email = False
    
    if member_age < 18:
        # For minors, email is optional - use parent's email for communications
        use_parent_email = not member_email
        if not member_email:
            member_email = None  # No separate email for child
        
        # Photo consent is required for minors
        if member_data.photoConsent is None:
            raise HTTPException(
                status_code=400,
                detail="Photo consent is required for family members under 18 years old"
            )
    else:
        # Adults must have their own email
        if not member_email:
            raise HTTPException(
                status_code=400,
                detail="Email is required for family members 18 years or older"
            )
    
    # Check if email already exists (only if email is provided)
    if member_email:
        existing_user = await db.users.find_one({"email": member_email})
        if existing_user:
            raise HTTPException(
                status_code=400, 
                detail="A user with this email already exists"
            )
    
    # Generate a temporary password for the new member (if they have email)
    import secrets
    import string
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12)) if member_email else None
    
    # Create the family member user
    member_id = str(uuid4())
    parent_email = user.get("email", "")
    
    new_member = {
        "id": member_id,
        "_id": member_id,
        "username": member_email or f"child_{member_id[:8]}",  # Generate username if no email
        "fullName": member_data.fullName,
        "yearOfBirth": member_data.yearOfBirth,
        "phone": member_data.phone,
        "address": member_data.address or user.get("address", ""),
        "trainingGroup": member_data.trainingGroup,
        "role": "user",
        "emailVerified": True,  # Family members are pre-verified
        "hashed_password": hash_password(temp_password) if temp_password else hash_password(secrets.token_hex(16)),
        "primaryAccountId": user["_id"],  # Link to parent account
        "parentEmail": parent_email,  # Store parent's email for notifications
        "relationship": member_data.relationship,
        "dependentMembers": [],
        "isMinor": member_age < 18,
        "useParentEmail": use_parent_email,
        "createdAt": datetime.utcnow(),
        "createdBy": user["_id"]
    }
    
    # Add photo consent for minors
    if member_age < 18:
        new_member["photoConsent"] = member_data.photoConsent
        new_member["photoConsentGivenBy"] = user["_id"]
        new_member["photoConsentGivenAt"] = datetime.utcnow()
    
    # Only include email field if it has a value (to avoid MongoDB unique index conflict on null)
    if member_email:
        new_member["email"] = member_email
    
    # Insert the new member
    await db.users.insert_one(new_member)
    
    # Update the parent user's dependentMembers list
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$push": {"dependentMembers": member_id}}
    )
    
    # Send notification emails
    try:
        from email_service import send_email
        import logging
        logger = logging.getLogger(__name__)
        
        # Determine recipient email - parent's email if child has no email
        notification_email = member_email if member_email else parent_email
        
        if member_email:
            # Member has own email - send credentials to them
            html_content = f"""
            <h2>Welcome to Srpsko Kulturno Društvo Täby!</h2>
            <p>Dear {member_data.fullName},</p>
            <p>You have been added as a family member by {user.get('fullName', 'your family member')}.</p>
            <p>You can now log in to your own account using the following credentials:</p>
            <p><strong>Email:</strong> {member_email}</p>
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
            Email: {member_email}
            Temporary Password: {temp_password}
            
            ⚠️ Important: Please change your password after your first login.
            
            Best regards,
            SKUD Täby Team
            """
            
            logger.info(f"Sending welcome email to new family member: {member_email}")
            await send_email(
                to_email=member_email,
                subject="Welcome to SKUD Täby - Your Account Has Been Created",
                html_content=html_content,
                text_content=text_content,
                db=db
            )
        
        # Always notify parent about the new family member
        parent_html = f"""
        <h2>Family Member Added - Srpsko Kulturno Društvo Täby</h2>
        <p>Dear {user.get('fullName', 'Parent')},</p>
        <p>You have successfully added <strong>{member_data.fullName}</strong> as a family member to your account.</p>
        {'<p>Since ' + member_data.fullName + ' is under 18, all platform communications will be sent to your email address.</p>' if not member_email else '<p>Login credentials have been sent to their email address.</p>'}
        <p><strong>Member Details:</strong></p>
        <ul>
            <li>Name: {member_data.fullName}</li>
            <li>Year of Birth: {member_data.yearOfBirth}</li>
            <li>Relationship: {member_data.relationship}</li>
            <li>Training Group: {member_data.trainingGroup or 'Not assigned'}</li>
        </ul>
        <p>You can manage this family member from your dashboard.</p>
        <br>
        <p>Best regards,<br>SKUD Täby Team</p>
        """
        
        parent_text = f"""
        Family Member Added - Srpsko Kulturno Društvo Täby
        
        Dear {user.get('fullName', 'Parent')},
        
        You have successfully added {member_data.fullName} as a family member to your account.
        
        Member Details:
        - Name: {member_data.fullName}
        - Year of Birth: {member_data.yearOfBirth}
        - Relationship: {member_data.relationship}
        - Training Group: {member_data.trainingGroup or 'Not assigned'}
        
        You can manage this family member from your dashboard.
        
        Best regards,
        SKUD Täby Team
        """
        
        logger.info(f"Sending confirmation email to parent: {parent_email}")
        await send_email(
            to_email=parent_email,
            subject=f"Family Member Added: {member_data.fullName}",
            html_content=parent_html,
            text_content=parent_text,
            db=db
        )
        
        # Also notify info@srpskoudruzenjetaby.se about new registration
        admin_html = f"""
        <h2>New Family Member Registration - SKUD Täby</h2>
        <p>A new family member has been registered on the platform.</p>
        <p><strong>Parent Account:</strong></p>
        <ul>
            <li>Name: {user.get('fullName', 'Unknown')}</li>
            <li>Email: {user.get('email', 'Unknown')}</li>
        </ul>
        <p><strong>New Family Member:</strong></p>
        <ul>
            <li>Name: {member_data.fullName}</li>
            <li>Year of Birth: {member_data.yearOfBirth}</li>
            <li>Relationship: {member_data.relationship}</li>
            <li>Email: {member_email or 'Using parent email'}</li>
            <li>Training Group: {member_data.trainingGroup or 'Not assigned'}</li>
        </ul>
        <p>Registered at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
        """
        
        admin_text = f"""
        New Family Member Registration - SKUD Täby
        
        Parent Account:
        - Name: {user.get('fullName', 'Unknown')}
        - Email: {user.get('email', 'Unknown')}
        
        New Family Member:
        - Name: {member_data.fullName}
        - Year of Birth: {member_data.yearOfBirth}
        - Relationship: {member_data.relationship}
        - Email: {member_email or 'Using parent email'}
        - Training Group: {member_data.trainingGroup or 'Not assigned'}
        
        Registered at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC
        """
        
        logger.info("Sending notification to info@srpskoudruzenjetaby.se about new family member")
        await send_email(
            to_email="info@srpskoudruzenjetaby.se",
            subject=f"New Family Member Registration: {member_data.fullName}",
            html_content=admin_html,
            text_content=admin_text,
            db=db
        )
        
    except Exception as e:
        print(f"Failed to send email: {e}")
        import traceback
        traceback.print_exc()
        # Don't fail the request if email fails
    
    # Return the created member (without sensitive data)
    if use_parent_email:
        message = f"Family member added successfully. Notifications will be sent to your email ({parent_email})"
    else:
        message = f"Family member added successfully. Login credentials sent to {member_email}"
    
    return {
        "success": True,
        "message": message,
        "member": {
            "id": member_id,
            "fullName": member_data.fullName,
            "email": member_email,
            "yearOfBirth": member_data.yearOfBirth,
            "relationship": member_data.relationship,
            "primaryAccountId": user["_id"],
            "useParentEmail": use_parent_email,
            "parentEmail": parent_email if use_parent_email else None
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
    Email is optional for children under 18.
    """
    db = request.app.state.db
    
    # Find the parent user
    parent_user = await db.users.find_one({"_id": user_id})
    if not parent_user:
        # Try with id field
        parent_user = await db.users.find_one({"id": user_id})
    
    if not parent_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate member's age
    member_age = calculate_age(member_data.yearOfBirth)
    
    # Email handling - optional for minors
    member_email = member_data.email
    use_parent_email = False
    parent_email = parent_user.get("email", "")
    
    if member_age < 18:
        use_parent_email = not member_email
        if not member_email:
            member_email = None
        
        # Photo consent is required for minors
        if member_data.photoConsent is None:
            raise HTTPException(
                status_code=400,
                detail="Photo consent is required for family members under 18 years old"
            )
    else:
        if not member_email:
            raise HTTPException(
                status_code=400,
                detail="Email is required for family members 18 years or older"
            )
    
    # Check if email already exists (only if provided)
    if member_email:
        existing_user = await db.users.find_one({"email": member_email})
        if existing_user:
            raise HTTPException(
                status_code=400, 
                detail="A user with this email already exists"
            )
    
    # Generate a temporary password
    import secrets
    import string
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12)) if member_email else None
    
    # Create the family member user
    member_id = str(uuid4())
    parent_id = parent_user.get("_id") or parent_user.get("id")
    
    new_member = {
        "id": member_id,
        "_id": member_id,
        "username": member_email or f"child_{member_id[:8]}",
        "fullName": member_data.fullName,
        "yearOfBirth": member_data.yearOfBirth,
        "phone": member_data.phone,
        "address": member_data.address or parent_user.get("address", ""),
        "trainingGroup": member_data.trainingGroup,
        "role": "user",
        "emailVerified": True,
        "hashed_password": hash_password(temp_password) if temp_password else hash_password(secrets.token_hex(16)),
        "primaryAccountId": parent_id,
        "parentEmail": parent_email,
        "relationship": member_data.relationship,
        "dependentMembers": [],
        "isMinor": member_age < 18,
        "useParentEmail": use_parent_email,
        "createdAt": datetime.utcnow(),
        "createdBy": admin.get("_id") or admin.get("id")
    }
    
    # Add photo consent for minors
    if member_age < 18:
        new_member["photoConsent"] = member_data.photoConsent
        new_member["photoConsentGivenBy"] = admin.get("_id") or admin.get("id")
        new_member["photoConsentGivenAt"] = datetime.utcnow()
    
    # Only include email field if it has a value (to avoid MongoDB unique index conflict on null)
    if member_email:
        new_member["email"] = member_email
    
    # Insert the new member
    await db.users.insert_one(new_member)
    
    # Update the parent user's dependentMembers list
    await db.users.update_one(
        {"_id": parent_id},
        {"$push": {"dependentMembers": member_id}}
    )
    
    # Send notification emails
    try:
        from email_service import send_email
        import logging
        logger = logging.getLogger(__name__)
        
        if member_email:
            # Member has own email - send credentials to them
            html_content = f"""
            <h2>Welcome to Srpsko Kulturno Društvo Täby!</h2>
            <p>Dear {member_data.fullName},</p>
            <p>An administrator has created an account for you as a family member of {parent_user.get('fullName', 'another member')}.</p>
            <p>You can now log in using:</p>
            <p><strong>Email:</strong> {member_email}</p>
            <p><strong>Temporary Password:</strong> {temp_password}</p>
            <p><strong>⚠️ Important:</strong> Please change your password after your first login.</p>
            <br>
            <p>Best regards,<br>SKUD Täby Team</p>
            """
            
            text_content = f"""
            Welcome to Srpsko Kulturno Društvo Täby!
            
            Dear {member_data.fullName},
            
            An administrator has created an account for you as a family member of {parent_user.get('fullName', 'another member')}.
            
            Email: {member_email}
            Temporary Password: {temp_password}
            
            ⚠️ Important: Please change your password after your first login.
            
            Best regards,
            SKUD Täby Team
            """
            
            logger.info(f"Sending welcome email to new family member: {member_email}")
            await send_email(
                to_email=member_email,
                subject="Welcome to SKUD Täby - Your Account Has Been Created",
                html_content=html_content,
                text_content=text_content,
                db=db
            )
        
        # Always notify parent about the new family member
        parent_html = f"""
        <h2>Family Member Added - Srpsko Kulturno Društvo Täby</h2>
        <p>Dear {parent_user.get('fullName', 'Parent')},</p>
        <p>{'An administrator has added' if admin else 'You have successfully added'} <strong>{member_data.fullName}</strong> as a family member to your account.</p>
        {'<p>Since ' + member_data.fullName + ' is under 18, all platform communications will be sent to your email address.</p>' if not member_email else '<p>Login credentials have been sent to their email address.</p>'}
        <p><strong>Member Details:</strong></p>
        <ul>
            <li>Name: {member_data.fullName}</li>
            <li>Year of Birth: {member_data.yearOfBirth}</li>
            <li>Relationship: {member_data.relationship}</li>
            <li>Training Group: {member_data.trainingGroup or 'Not assigned'}</li>
        </ul>
        <p>You can manage this family member from your dashboard.</p>
        <br>
        <p>Best regards,<br>SKUD Täby Team</p>
        """
        
        parent_text = f"""
        Family Member Added - Srpsko Kulturno Društvo Täby
        
        Dear {parent_user.get('fullName', 'Parent')},
        
        {'An administrator has added' if admin else 'You have successfully added'} {member_data.fullName} as a family member to your account.
        
        Member Details:
        - Name: {member_data.fullName}
        - Year of Birth: {member_data.yearOfBirth}
        - Relationship: {member_data.relationship}
        - Training Group: {member_data.trainingGroup or 'Not assigned'}
        
        You can manage this family member from your dashboard.
        
        Best regards,
        SKUD Täby Team
        """
        
        logger.info(f"Sending confirmation email to parent: {parent_email}")
        await send_email(
            to_email=parent_email,
            subject=f"Family Member Added: {member_data.fullName}",
            html_content=parent_html,
            text_content=parent_text,
            db=db
        )
        
        # Also notify info@srpskoudruzenjetaby.se about new registration
        admin_html = f"""
        <h2>New Family Member Registration - SKUD Täby</h2>
        <p>A new family member has been registered on the platform by an administrator.</p>
        <p><strong>Added By Admin:</strong> {admin.get('fullName', admin.get('email', 'Unknown'))}</p>
        <p><strong>Parent Account:</strong></p>
        <ul>
            <li>Name: {parent_user.get('fullName', 'Unknown')}</li>
            <li>Email: {parent_user.get('email', 'Unknown')}</li>
        </ul>
        <p><strong>New Family Member:</strong></p>
        <ul>
            <li>Name: {member_data.fullName}</li>
            <li>Year of Birth: {member_data.yearOfBirth}</li>
            <li>Relationship: {member_data.relationship}</li>
            <li>Email: {member_email or 'Using parent email'}</li>
            <li>Training Group: {member_data.trainingGroup or 'Not assigned'}</li>
        </ul>
        <p>Registered at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
        """
        
        admin_text = f"""
        New Family Member Registration - SKUD Täby
        
        Added By Admin: {admin.get('fullName', admin.get('email', 'Unknown'))}
        
        Parent Account:
        - Name: {parent_user.get('fullName', 'Unknown')}
        - Email: {parent_user.get('email', 'Unknown')}
        
        New Family Member:
        - Name: {member_data.fullName}
        - Year of Birth: {member_data.yearOfBirth}
        - Relationship: {member_data.relationship}
        - Email: {member_email or 'Using parent email'}
        - Training Group: {member_data.trainingGroup or 'Not assigned'}
        
        Registered at: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC
        """
        
        logger.info("Sending notification to info@srpskoudruzenjetaby.se about new family member")
        await send_email(
            to_email="info@srpskoudruzenjetaby.se",
            subject=f"New Family Member Registration: {member_data.fullName}",
            html_content=admin_html,
            text_content=admin_text,
            db=db
        )
        
    except Exception as e:
        print(f"Failed to send email: {e}")
        import traceback
        traceback.print_exc()
    
    if use_parent_email:
        message = f"Family member added successfully. Notifications will be sent to parent's email ({parent_email})"
    else:
        message = f"Family member added successfully. Login credentials sent to {member_email}"
    
    return {
        "success": True,
        "message": message,
        "member": {
            "id": member_id,
            "fullName": member_data.fullName,
            "email": member_email,
            "yearOfBirth": member_data.yearOfBirth,
            "relationship": member_data.relationship,
            "primaryAccountId": parent_id,
            "useParentEmail": use_parent_email
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



# ===========================================
# PHOTO CONSENT MANAGEMENT
# ===========================================

@router.put("/members/{member_id}/photo-consent")
async def update_photo_consent(
    member_id: str,
    consent: bool,
    user: dict = Depends(get_current_user),
    request: Request = None
):
    """
    Update photo consent for a family member (minor).
    Only the parent/guardian can update consent for their dependents.
    """
    db = request.app.state.db
    
    # Find the member
    member = await db.users.find_one({"$or": [{"_id": member_id}, {"id": member_id}]})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Check if current user is the parent/guardian
    user_id = user.get("_id") or user.get("id")
    primary_account_id = member.get("primaryAccountId")
    
    if primary_account_id != user_id:
        raise HTTPException(status_code=403, detail="Only the parent/guardian can update photo consent")
    
    # Check if member is a minor
    member_age = calculate_age(member.get("yearOfBirth", ""))
    if member_age >= 18:
        raise HTTPException(status_code=400, detail="Photo consent is only applicable for minors (under 18)")
    
    # Update photo consent
    await db.users.update_one(
        {"$or": [{"_id": member_id}, {"id": member_id}]},
        {
            "$set": {
                "photoConsent": consent,
                "photoConsentGivenBy": user_id,
                "photoConsentGivenAt": datetime.utcnow()
            }
        }
    )
    
    return {
        "success": True,
        "message": f"Photo consent {'granted' if consent else 'revoked'} for {member.get('fullName')}"
    }


@router.get("/minors-without-consent")
async def get_minors_without_consent(
    user: dict = Depends(get_current_user),
    request: Request = None
):
    """
    Get all minors (children) without photo consent for the current user.
    """
    db = request.app.state.db
    
    user_id = user.get("_id") or user.get("id")
    current_year = datetime.now().year
    min_year = str(current_year - 18)  # Born after this year = under 18
    
    # Find minors without photo consent that belong to this user
    minors = await db.users.find({
        "primaryAccountId": user_id,
        "yearOfBirth": {"$gt": min_year},
        "$or": [
            {"photoConsent": {"$exists": False}},
            {"photoConsent": None}
        ]
    }, {"_id": 0, "id": 1, "fullName": 1, "yearOfBirth": 1}).to_list(length=100)
    
    return {
        "minors": minors,
        "total": len(minors)
    }


@router.post("/admin/send-consent-reminders")
async def send_photo_consent_reminders(
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """
    Send email reminders to all parents who have minors without photo consent.
    Admin only endpoint.
    """
    db = request.app.state.db
    
    current_year = datetime.now().year
    min_year = str(current_year - 18)
    
    # Find all minors without photo consent
    minors_without_consent = await db.users.find({
        "yearOfBirth": {"$gt": min_year},
        "primaryAccountId": {"$exists": True, "$ne": None},
        "$or": [
            {"photoConsent": {"$exists": False}},
            {"photoConsent": None}
        ]
    }).to_list(length=1000)
    
    if not minors_without_consent:
        return {"success": True, "message": "No minors without consent found", "emails_sent": 0}
    
    # Group by parent
    parents_to_notify = {}
    for minor in minors_without_consent:
        parent_id = minor.get("primaryAccountId")
        if parent_id not in parents_to_notify:
            parents_to_notify[parent_id] = []
        parents_to_notify[parent_id].append(minor)
    
    # Get parent details and send emails
    from email_service import send_email
    emails_sent = 0
    errors = []
    
    for parent_id, children in parents_to_notify.items():
        parent = await db.users.find_one({"$or": [{"_id": parent_id}, {"id": parent_id}]})
        if not parent or not parent.get("email"):
            continue
        
        # Build children list for email
        children_list = "\n".join([f"  - {c.get('fullName')}" for c in children])
        children_html = "".join([f"<li>{c.get('fullName')}</li>" for c in children])
        
        html_content = f"""
        <h2>Photo Consent Required - SKUD Täby</h2>
        <p>Dear {parent.get('fullName', 'Parent')},</p>
        <p>We need your consent to photograph and publish pictures of your registered children on our website and social media.</p>
        <p><strong>Children requiring consent:</strong></p>
        <ul>
            {children_html}
        </ul>
        <p>Please log in to your account and provide consent for each child in the Family section of your dashboard.</p>
        <p><a href="https://srpskoudruzenjetaby.se/dashboard" style="display:inline-block;padding:10px 20px;background-color:#C1272D;color:white;text-decoration:none;border-radius:5px;">Go to Dashboard</a></p>
        <br>
        <p>Best regards,<br>SKUD Täby Team</p>
        <hr>
        <h2>Saglasnost za fotografisanje - SKUD Täby</h2>
        <p>Poštovani/a {parent.get('fullName', 'Roditelju')},</p>
        <p>Potrebna nam je Vaša saglasnost za fotografisanje i objavljivanje fotografija Vaše dece na našoj web stranici i društvenim mrežama.</p>
        <p><strong>Deca za koju je potrebna saglasnost:</strong></p>
        <ul>
            {children_html}
        </ul>
        <p>Molimo Vas da se prijavite na svoj nalog i date saglasnost za svako dete u sekciji Porodica na kontrolnoj tabli.</p>
        """
        
        text_content = f"""
Photo Consent Required - SKUD Täby

Dear {parent.get('fullName', 'Parent')},

We need your consent to photograph and publish pictures of your registered children on our website and social media.

Children requiring consent:
{children_list}

Please log in to your account and provide consent for each child in the Family section of your dashboard.

---

Saglasnost za fotografisanje - SKUD Täby

Poštovani/a {parent.get('fullName', 'Roditelju')},

Potrebna nam je Vaša saglasnost za fotografisanje i objavljivanje fotografija Vaše dece na našoj web stranici i društvenim mrežama.

Deca za koja je potrebna saglasnost:
{children_list}

Molimo Vas da se prijavite na svoj nalog i date saglasnost za svako dete u sekciji Porodica na kontrolnoj tabli.

Best regards / Srdačan pozdrav,
SKUD Täby Team
        """
        
        try:
            await send_email(
                to_email=parent.get("email"),
                subject="Photo Consent Required / Saglasnost za fotografisanje - SKUD Täby",
                html_content=html_content,
                text_content=text_content,
                db=db
            )
            emails_sent += 1
        except Exception as e:
            errors.append(f"Failed to send to {parent.get('email')}: {str(e)}")
    
    return {
        "success": True,
        "message": f"Sent {emails_sent} reminder emails",
        "emails_sent": emails_sent,
        "parents_notified": len(parents_to_notify),
        "errors": errors if errors else None
    }
