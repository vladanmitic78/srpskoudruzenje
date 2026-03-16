"""
Document Management System API Routes

Three document types:
1. Public Documents - Generic documents for all members
2. Personal Documents - Private documents for individual members
3. Association Documents - Official organizational documents
"""

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from datetime import datetime
from uuid import uuid4
from typing import List, Optional
from pathlib import Path
import os
import logging
import shutil

from dependencies import get_current_user, get_admin_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Document storage directory
DOCUMENTS_DIR = Path("/app/backend/uploads/documents")
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)

# Allowed file types
ALLOWED_EXTENSIONS = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'text/plain': '.txt',
    'text/csv': '.csv',
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

def get_file_extension(content_type: str, filename: str) -> str:
    """Get file extension from content type or filename"""
    if content_type in ALLOWED_EXTENSIONS:
        return ALLOWED_EXTENSIONS[content_type]
    # Fallback to filename extension
    if '.' in filename:
        return '.' + filename.rsplit('.', 1)[1].lower()
    return '.bin'


# ===========================================
# PUBLIC DOCUMENTS - For all members
# ===========================================

@router.get("/public")
async def get_public_documents(
    category: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user),
    request: Request = None
):
    """Get all public documents (accessible to all logged-in members)"""
    db = request.app.state.db
    
    query = {"type": "public"}
    
    if category and category != "all":
        query["category"] = category
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    documents = await db.documents.find(
        query,
        {"_id": 0}
    ).sort("createdAt", -1).to_list(length=500)
    
    # Get unique categories
    categories = await db.documents.distinct("category", {"type": "public"})
    
    return {
        "documents": documents,
        "total": len(documents),
        "categories": [c for c in categories if c]
    }


@router.post("/public")
async def upload_public_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    category: str = Form("general"),
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Upload a public document (Admin only)"""
    db = request.app.state.db
    
    # Validate file type
    if file.content_type not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed types: PDF, Images, Word, Excel, PowerPoint, Text, CSV"
        )
    
    # Read file
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB")
    
    # Generate unique filename
    doc_id = str(uuid4())
    extension = get_file_extension(file.content_type, file.filename)
    stored_filename = f"public_{doc_id}{extension}"
    file_path = DOCUMENTS_DIR / stored_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Create document record
    document = {
        "id": doc_id,
        "type": "public",
        "title": title,
        "description": description,
        "category": category,
        "fileName": file.filename,
        "storedFileName": stored_filename,
        "fileUrl": f"/api/documents/files/{stored_filename}",
        "fileSize": file_size,
        "mimeType": file.content_type,
        "uploadedBy": admin.get("_id") or admin.get("id"),
        "uploadedByName": admin.get("fullName") or admin.get("email"),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
        "downloadCount": 0
    }
    
    await db.documents.insert_one(document)
    
    logger.info(f"Public document uploaded: {title} by {admin.get('email')}")
    
    return {
        "success": True,
        "message": "Document uploaded successfully",
        "document": {
            "id": doc_id,
            "title": title,
            "fileName": file.filename,
            "fileUrl": document["fileUrl"]
        }
    }


@router.put("/public/{doc_id}")
async def update_public_document(
    doc_id: str,
    title: str = Form(None),
    description: str = Form(None),
    category: str = Form(None),
    file: UploadFile = File(None),
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Update a public document (Admin only)"""
    db = request.app.state.db
    
    # Find existing document
    doc = await db.documents.find_one({"id": doc_id, "type": "public"})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    update_data = {"updatedAt": datetime.utcnow()}
    
    if title:
        update_data["title"] = title
    if description is not None:
        update_data["description"] = description
    if category:
        update_data["category"] = category
    
    # Handle file replacement
    if file:
        if file.content_type not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="File type not allowed")
        
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large")
        
        # Delete old file
        old_file_path = DOCUMENTS_DIR / doc["storedFileName"]
        if old_file_path.exists():
            old_file_path.unlink()
        
        # Save new file
        extension = get_file_extension(file.content_type, file.filename)
        stored_filename = f"public_{doc_id}{extension}"
        file_path = DOCUMENTS_DIR / stored_filename
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        update_data["fileName"] = file.filename
        update_data["storedFileName"] = stored_filename
        update_data["fileUrl"] = f"/api/documents/files/{stored_filename}"
        update_data["fileSize"] = file_size
        update_data["mimeType"] = file.content_type
    
    await db.documents.update_one(
        {"id": doc_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Document updated successfully"}


@router.delete("/public/{doc_id}")
async def delete_public_document(
    doc_id: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Delete a public document (Admin only)"""
    db = request.app.state.db
    
    doc = await db.documents.find_one({"id": doc_id, "type": "public"})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file
    file_path = DOCUMENTS_DIR / doc["storedFileName"]
    if file_path.exists():
        file_path.unlink()
    
    # Delete record
    await db.documents.delete_one({"id": doc_id})
    
    logger.info(f"Public document deleted: {doc['title']} by {admin.get('email')}")
    
    return {"success": True, "message": "Document deleted successfully"}


# ===========================================
# PERSONAL DOCUMENTS - For specific members
# ===========================================

@router.get("/personal")
async def get_my_personal_documents(
    user: dict = Depends(get_current_user),
    request: Request = None
):
    """Get current user's personal documents"""
    db = request.app.state.db
    
    user_id = user.get("_id") or user.get("id")
    
    documents = await db.documents.find(
        {
            "type": "personal",
            "assignedTo": user_id
        },
        {"_id": 0}
    ).sort("createdAt", -1).to_list(length=500)
    
    return {
        "documents": documents,
        "total": len(documents)
    }


@router.get("/personal/admin")
async def admin_get_all_personal_documents(
    user_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Get all personal documents (Admin only), optionally filtered by user"""
    db = request.app.state.db
    
    query = {"type": "personal"}
    
    if user_id:
        query["assignedTo"] = user_id
    
    documents = await db.documents.find(
        query,
        {"_id": 0}
    ).sort("createdAt", -1).to_list(length=1000)
    
    # Enrich with user names
    user_ids = set()
    for doc in documents:
        if doc.get("assignedTo"):
            if isinstance(doc["assignedTo"], list):
                user_ids.update(doc["assignedTo"])
            else:
                user_ids.add(doc["assignedTo"])
    
    users = {}
    if user_ids:
        user_list = await db.users.find(
            {"$or": [{"_id": {"$in": list(user_ids)}}, {"id": {"$in": list(user_ids)}}]},
            {"_id": 0, "id": 1, "fullName": 1, "email": 1}
        ).to_list(length=1000)
        users = {u.get("id") or u.get("_id"): u for u in user_list}
    
    # Add user info to documents
    for doc in documents:
        if doc.get("assignedTo"):
            assigned_users = doc["assignedTo"] if isinstance(doc["assignedTo"], list) else [doc["assignedTo"]]
            doc["assignedUsers"] = [
                users.get(uid, {"id": uid, "fullName": "Unknown", "email": ""})
                for uid in assigned_users
            ]
    
    return {
        "documents": documents,
        "total": len(documents)
    }


@router.post("/personal")
async def upload_personal_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    user_id: str = Form(...),
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Upload a personal document for a specific member (Admin only)"""
    db = request.app.state.db
    
    # Validate user exists
    target_user = await db.users.find_one({"$or": [{"_id": user_id}, {"id": user_id}]})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate file type
    if file.content_type not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    # Read file
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB")
    
    # Generate unique filename
    doc_id = str(uuid4())
    extension = get_file_extension(file.content_type, file.filename)
    stored_filename = f"personal_{doc_id}{extension}"
    file_path = DOCUMENTS_DIR / stored_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Create document record
    document = {
        "id": doc_id,
        "type": "personal",
        "title": title,
        "description": description,
        "fileName": file.filename,
        "storedFileName": stored_filename,
        "fileUrl": f"/api/documents/files/{stored_filename}",
        "fileSize": file_size,
        "mimeType": file.content_type,
        "assignedTo": [user_id],
        "uploadedBy": admin.get("_id") or admin.get("id"),
        "uploadedByName": admin.get("fullName") or admin.get("email"),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
        "downloadCount": 0
    }
    
    await db.documents.insert_one(document)
    
    # Send notification email to the member
    try:
        from email_service import send_email
        
        user_email = target_user.get("email")
        if user_email:
            html_content = f"""
            <h2>New Document Available - SKUD Täby</h2>
            <p>Dear {target_user.get('fullName', 'Member')},</p>
            <p>A new document has been added to your account:</p>
            <p><strong>{title}</strong></p>
            {f'<p>{description}</p>' if description else ''}
            <p>You can view and download this document from your dashboard.</p>
            <br>
            <p>Best regards,<br>SKUD Täby Team</p>
            """
            
            await send_email(
                to_email=user_email,
                subject=f"New Document: {title}",
                html_content=html_content,
                text_content=f"A new document '{title}' has been added to your account.",
                db=db
            )
    except Exception as e:
        logger.error(f"Failed to send document notification email: {e}")
    
    logger.info(f"Personal document uploaded: {title} for user {user_id} by {admin.get('email')}")
    
    return {
        "success": True,
        "message": "Document uploaded and user notified",
        "document": {
            "id": doc_id,
            "title": title,
            "fileName": file.filename,
            "fileUrl": document["fileUrl"]
        }
    }


@router.post("/personal/bulk")
async def bulk_upload_personal_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    user_ids: str = Form(...),  # Comma-separated user IDs
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Upload the same document to multiple members (Admin only)"""
    db = request.app.state.db
    
    # Parse user IDs
    user_id_list = [uid.strip() for uid in user_ids.split(",") if uid.strip()]
    
    if not user_id_list:
        raise HTTPException(status_code=400, detail="No user IDs provided")
    
    # Validate file type
    if file.content_type not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    # Read file
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB")
    
    # Validate users exist
    valid_users = await db.users.find(
        {"$or": [{"_id": {"$in": user_id_list}}, {"id": {"$in": user_id_list}}]},
        {"_id": 0, "id": 1, "fullName": 1, "email": 1}
    ).to_list(length=1000)
    
    valid_user_ids = [u.get("id") for u in valid_users]
    
    if not valid_user_ids:
        raise HTTPException(status_code=400, detail="No valid users found")
    
    # Generate unique filename
    doc_id = str(uuid4())
    extension = get_file_extension(file.content_type, file.filename)
    stored_filename = f"personal_bulk_{doc_id}{extension}"
    file_path = DOCUMENTS_DIR / stored_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Create document record with all assigned users
    document = {
        "id": doc_id,
        "type": "personal",
        "title": title,
        "description": description,
        "fileName": file.filename,
        "storedFileName": stored_filename,
        "fileUrl": f"/api/documents/files/{stored_filename}",
        "fileSize": file_size,
        "mimeType": file.content_type,
        "assignedTo": valid_user_ids,
        "isBulkAssigned": True,
        "uploadedBy": admin.get("_id") or admin.get("id"),
        "uploadedByName": admin.get("fullName") or admin.get("email"),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
        "downloadCount": 0
    }
    
    await db.documents.insert_one(document)
    
    # Send notification emails to all members
    try:
        from email_service import send_email
        
        for user in valid_users:
            user_email = user.get("email")
            if user_email:
                html_content = f"""
                <h2>New Document Available - SKUD Täby</h2>
                <p>Dear {user.get('fullName', 'Member')},</p>
                <p>A new document has been added to your account:</p>
                <p><strong>{title}</strong></p>
                {f'<p>{description}</p>' if description else ''}
                <p>You can view and download this document from your dashboard.</p>
                <br>
                <p>Best regards,<br>SKUD Täby Team</p>
                """
                
                await send_email(
                    to_email=user_email,
                    subject=f"New Document: {title}",
                    html_content=html_content,
                    text_content=f"A new document '{title}' has been added to your account.",
                    db=db
                )
    except Exception as e:
        logger.error(f"Failed to send bulk document notification emails: {e}")
    
    logger.info(f"Bulk personal document uploaded: {title} for {len(valid_user_ids)} users by {admin.get('email')}")
    
    return {
        "success": True,
        "message": f"Document uploaded and assigned to {len(valid_user_ids)} members",
        "document": {
            "id": doc_id,
            "title": title,
            "fileName": file.filename,
            "assignedCount": len(valid_user_ids)
        }
    }


@router.delete("/personal/{doc_id}")
async def delete_personal_document(
    doc_id: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Delete a personal document (Admin only)"""
    db = request.app.state.db
    
    doc = await db.documents.find_one({"id": doc_id, "type": "personal"})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete file
    file_path = DOCUMENTS_DIR / doc["storedFileName"]
    if file_path.exists():
        file_path.unlink()
    
    # Delete record
    await db.documents.delete_one({"id": doc_id})
    
    logger.info(f"Personal document deleted: {doc['title']} by {admin.get('email')}")
    
    return {"success": True, "message": "Document deleted successfully"}


# ===========================================
# ASSOCIATION DOCUMENTS - Official org docs
# ===========================================

@router.get("/association")
async def get_association_documents(
    visibility: Optional[str] = None,
    category: Optional[str] = None,
    user: dict = Depends(get_current_user),
    request: Request = None
):
    """Get association/company documents"""
    db = request.app.state.db
    
    query = {"type": "association"}
    
    # Non-admin users can only see public or members_only docs
    user_role = user.get("role", "user")
    if user_role not in ["admin", "superadmin"]:
        query["visibility"] = {"$in": ["public", "members_only"]}
    elif visibility and visibility != "all":
        query["visibility"] = visibility
    
    if category and category != "all":
        query["category"] = category
    
    documents = await db.documents.find(
        query,
        {"_id": 0}
    ).sort([("category", 1), ("createdAt", -1)]).to_list(length=500)
    
    # Get unique categories
    categories = await db.documents.distinct("category", {"type": "association"})
    
    return {
        "documents": documents,
        "total": len(documents),
        "categories": [c for c in categories if c]
    }


@router.post("/association")
async def upload_association_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    category: str = Form("general"),
    visibility: str = Form("members_only"),  # public, members_only, internal
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Upload an association document (Admin only)"""
    db = request.app.state.db
    
    # Validate visibility
    if visibility not in ["public", "members_only", "internal"]:
        raise HTTPException(status_code=400, detail="Invalid visibility. Must be: public, members_only, or internal")
    
    # Validate file type
    if file.content_type not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    # Read file
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB")
    
    # Generate unique filename
    doc_id = str(uuid4())
    extension = get_file_extension(file.content_type, file.filename)
    stored_filename = f"association_{doc_id}{extension}"
    file_path = DOCUMENTS_DIR / stored_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Create document record
    document = {
        "id": doc_id,
        "type": "association",
        "title": title,
        "description": description,
        "category": category,
        "visibility": visibility,
        "fileName": file.filename,
        "storedFileName": stored_filename,
        "fileUrl": f"/api/documents/files/{stored_filename}",
        "fileSize": file_size,
        "mimeType": file.content_type,
        "version": 1,
        "versionHistory": [],
        "uploadedBy": admin.get("_id") or admin.get("id"),
        "uploadedByName": admin.get("fullName") or admin.get("email"),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
        "downloadCount": 0
    }
    
    await db.documents.insert_one(document)
    
    logger.info(f"Association document uploaded: {title} by {admin.get('email')}")
    
    return {
        "success": True,
        "message": "Association document uploaded successfully",
        "document": {
            "id": doc_id,
            "title": title,
            "fileName": file.filename,
            "fileUrl": document["fileUrl"],
            "visibility": visibility
        }
    }


@router.put("/association/{doc_id}")
async def update_association_document(
    doc_id: str,
    title: str = Form(None),
    description: str = Form(None),
    category: str = Form(None),
    visibility: str = Form(None),
    file: UploadFile = File(None),
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Update an association document, with version history if file is replaced (Admin only)"""
    db = request.app.state.db
    
    # Find existing document
    doc = await db.documents.find_one({"id": doc_id, "type": "association"})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    update_data = {"updatedAt": datetime.utcnow()}
    
    if title:
        update_data["title"] = title
    if description is not None:
        update_data["description"] = description
    if category:
        update_data["category"] = category
    if visibility and visibility in ["public", "members_only", "internal"]:
        update_data["visibility"] = visibility
    
    # Handle file replacement with version history
    if file:
        if file.content_type not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail="File type not allowed")
        
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large")
        
        # Save version history
        version_entry = {
            "version": doc.get("version", 1),
            "fileName": doc["fileName"],
            "storedFileName": doc["storedFileName"],
            "fileSize": doc["fileSize"],
            "uploadedBy": doc["uploadedBy"],
            "uploadedByName": doc["uploadedByName"],
            "archivedAt": datetime.utcnow()
        }
        
        # Save new file
        new_version = doc.get("version", 1) + 1
        extension = get_file_extension(file.content_type, file.filename)
        stored_filename = f"association_{doc_id}_v{new_version}{extension}"
        file_path = DOCUMENTS_DIR / stored_filename
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        update_data["fileName"] = file.filename
        update_data["storedFileName"] = stored_filename
        update_data["fileUrl"] = f"/api/documents/files/{stored_filename}"
        update_data["fileSize"] = file_size
        update_data["mimeType"] = file.content_type
        update_data["version"] = new_version
        update_data["uploadedBy"] = admin.get("_id") or admin.get("id")
        update_data["uploadedByName"] = admin.get("fullName") or admin.get("email")
        
        # Add to version history
        await db.documents.update_one(
            {"id": doc_id},
            {"$push": {"versionHistory": version_entry}}
        )
    
    await db.documents.update_one(
        {"id": doc_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Association document updated successfully"}


@router.delete("/association/{doc_id}")
async def delete_association_document(
    doc_id: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Delete an association document (Admin only)"""
    db = request.app.state.db
    
    doc = await db.documents.find_one({"id": doc_id, "type": "association"})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Delete current file
    file_path = DOCUMENTS_DIR / doc["storedFileName"]
    if file_path.exists():
        file_path.unlink()
    
    # Delete version history files
    for version in doc.get("versionHistory", []):
        old_file_path = DOCUMENTS_DIR / version["storedFileName"]
        if old_file_path.exists():
            old_file_path.unlink()
    
    # Delete record
    await db.documents.delete_one({"id": doc_id})
    
    logger.info(f"Association document deleted: {doc['title']} by {admin.get('email')}")
    
    return {"success": True, "message": "Document deleted successfully"}


# ===========================================
# FILE SERVING
# ===========================================

@router.get("/files/{filename}")
async def serve_document_file(
    filename: str,
    user: dict = Depends(get_current_user),
    request: Request = None
):
    """Serve document files with access control"""
    db = request.app.state.db
    
    file_path = DOCUMENTS_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Find the document to check permissions
    doc = await db.documents.find_one({"storedFileName": filename})
    
    if doc:
        user_id = user.get("_id") or user.get("id")
        user_role = user.get("role", "user")
        
        # Check access for personal documents
        if doc["type"] == "personal":
            assigned_to = doc.get("assignedTo", [])
            if user_id not in assigned_to and user_role not in ["admin", "superadmin"]:
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Check access for internal association documents
        if doc["type"] == "association" and doc.get("visibility") == "internal":
            if user_role not in ["admin", "superadmin"]:
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Increment download count
        await db.documents.update_one(
            {"storedFileName": filename},
            {"$inc": {"downloadCount": 1}}
        )
    
    # Determine content type
    content_type = "application/octet-stream"
    if doc:
        content_type = doc.get("mimeType", content_type)
    
    return FileResponse(
        path=file_path,
        filename=doc.get("fileName", filename) if doc else filename,
        media_type=content_type
    )


# ===========================================
# STATISTICS
# ===========================================

@router.get("/stats")
async def get_document_statistics(
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Get document statistics (Admin only)"""
    db = request.app.state.db
    
    # Count by type
    public_count = await db.documents.count_documents({"type": "public"})
    personal_count = await db.documents.count_documents({"type": "personal"})
    association_count = await db.documents.count_documents({"type": "association"})
    
    # Total downloads
    pipeline = [
        {"$group": {"_id": None, "totalDownloads": {"$sum": "$downloadCount"}}}
    ]
    result = await db.documents.aggregate(pipeline).to_list(length=1)
    total_downloads = result[0]["totalDownloads"] if result else 0
    
    # Recent uploads
    recent = await db.documents.find(
        {},
        {"_id": 0, "id": 1, "type": 1, "title": 1, "createdAt": 1, "uploadedByName": 1}
    ).sort("createdAt", -1).limit(10).to_list(length=10)
    
    return {
        "counts": {
            "public": public_count,
            "personal": personal_count,
            "association": association_count,
            "total": public_count + personal_count + association_count
        },
        "totalDownloads": total_downloads,
        "recentUploads": recent
    }
