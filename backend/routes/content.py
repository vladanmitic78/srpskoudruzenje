from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime
from pydantic import BaseModel
from typing import Dict, Optional

from dependencies import get_admin_user

router = APIRouter()

class PageContent(BaseModel):
    pageId: str  # home, gallery, about, serbian-story
    section: str  # e.g., "hero", "about-text", etc.
    content: Dict[str, str]  # Multi-language content
    
class PageContentUpdate(BaseModel):
    content: Dict[str, str]

@router.get("/pages/{page_id}")
async def get_page_content(page_id: str, request: Request):
    """Get all content blocks for a page (public)"""
    db = request.app.state.db
    
    content_blocks = await db.page_content.find({"pageId": page_id}).to_list(length=100)
    
    return {
        "pageId": page_id,
        "blocks": [{**block, "id": str(block["_id"])} for block in content_blocks]
    }

@router.post("/pages")
async def create_page_content(
    page_content: PageContent,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Create new content block (Admin only)"""
    db = request.app.state.db
    
    content_dict = page_content.dict()
    content_dict["_id"] = f"{page_content.pageId}_{page_content.section}_{int(datetime.utcnow().timestamp() * 1000)}"
    content_dict["updatedAt"] = datetime.utcnow()
    content_dict["updatedBy"] = admin["_id"]
    
    await db.page_content.insert_one(content_dict)
    
    return {"success": True, "message": "Content created successfully", "id": content_dict["_id"]}

@router.put("/pages/{content_id}")
async def update_page_content(
    content_id: str,
    content_update: PageContentUpdate,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Update content block (Admin only)"""
    db = request.app.state.db
    
    result = await db.page_content.update_one(
        {"_id": content_id},
        {
            "$set": {
                "content": content_update.content,
                "updatedAt": datetime.utcnow(),
                "updatedBy": admin["_id"]
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Content block not found")
    
    return {"success": True, "message": "Content updated successfully"}

@router.delete("/pages/{content_id}")
async def delete_page_content(
    content_id: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Delete content block (Admin only)"""
    db = request.app.state.db
    
    result = await db.page_content.delete_one({"_id": content_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Content block not found")
    
    return {"success": True, "message": "Content deleted successfully"}

@router.get("/pages")
async def list_all_pages(admin: dict = Depends(get_admin_user), request: Request = None):
    """List all editable pages with their content blocks"""
    db = request.app.state.db
    
    pages = ["home", "gallery", "about", "serbian-story"]
    result = {}
    
    for page_id in pages:
        content_blocks = await db.page_content.find({"pageId": page_id}).to_list(length=100)
        result[page_id] = [{**block, "id": str(block["_id"])} for block in content_blocks]
    
    return result

# Gallery Management
from fastapi import UploadFile, File
from pathlib import Path
import shutil
import logging
from utils.media_optimizer import optimize_uploaded_file

logger = logging.getLogger(__name__)

@router.post("/gallery/upload")
async def upload_gallery_file(
    file: UploadFile = File(...),
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Upload image or video to gallery"""
    db = request.app.state.db
    
    # Create uploads directory
    upload_dir = Path("/app/uploads/gallery")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Validate file type
    file_ext = Path(file.filename).suffix.lower()
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm', '.mov']
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(allowed_extensions)}")
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"gallery_{timestamp}{file_ext}"
    file_path = upload_dir / safe_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Automatically optimize the uploaded file
    optimize_uploaded_file(file_path)
    logger.info(f"Optimized uploaded content file: {safe_filename}")
    
    file_type = 'video' if file_ext in ['.mp4', '.webm', '.mov'] else 'image'
    file_url = f"/api/content/gallery/file/{safe_filename}"
    
    # Add to gallery collection
    gallery_item = {
        "type": file_type,
        "url": file_url,
        "fileName": safe_filename,
        "uploadedAt": datetime.utcnow(),
        "uploadedBy": admin["_id"]
    }
    
    await db.gallery.insert_one(gallery_item)
    
    return {"success": True, "item": {**gallery_item, "id": str(gallery_item["_id"])}}

@router.get("/gallery/items")
async def get_gallery_items(request: Request):
    """Get all gallery items"""
    db = request.app.state.db
    items = await db.gallery.find().sort("uploadedAt", -1).to_list(length=None)
    return {"items": [{**item, "id": str(item["_id"])} for item in items]}

@router.delete("/gallery/{item_id}")
async def delete_gallery_item(
    item_id: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Delete gallery item"""
    db = request.app.state.db
    
    item = await db.gallery.find_one({"_id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Delete file
    if item.get("fileName"):
        file_path = Path("/app/uploads/gallery") / item["fileName"]
        if file_path.exists():
            file_path.unlink()
    
    await db.gallery.delete_one({"_id": item_id})
    return {"success": True}

@router.get("/gallery/file/{filename}")
async def get_gallery_file(filename: str):
    """Serve gallery file"""
    from fastapi.responses import FileResponse
    file_path = Path("/app/uploads/gallery") / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(path=str(file_path))

# About Page Management
class AboutContent(BaseModel):
    content: Dict[str, str]

@router.get("/about")
async def get_about_content(request: Request):
    """Get about page content"""
    db = request.app.state.db
    content = await db.content.find_one({"pageId": "about"})
    
    if not content:
        return {"content": {"sr-latin": "", "sr-cyrillic": "", "en": "", "sv": ""}}
    
    return {"content": content.get("content", {})}

@router.put("/about")
async def update_about_content(
    data: AboutContent,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Update about page content"""
    db = request.app.state.db
    
    await db.content.update_one(
        {"pageId": "about"},
        {"$set": {"content": data.content, "updatedAt": datetime.utcnow(), "updatedBy": admin["_id"]}},
        upsert=True
    )
    
    return {"success": True}

# Serbian Story Management
class SerbianStoryContent(BaseModel):
    content: Dict[str, str]
    sourceLink: Optional[str] = None

@router.get("/serbian-story")
async def get_serbian_story_content(request: Request):
    """Get Serbian story content"""
    db = request.app.state.db
    content = await db.content.find_one({"pageId": "serbian-story"})
    
    if not content:
        return {
            "content": {"sr-latin": "", "sr-cyrillic": "", "en": "", "sv": ""},
            "imageUrl": None,
            "sourceLink": None
        }
    
    return {
        "content": content.get("content", {}),
        "imageUrl": content.get("imageUrl"),
        "sourceLink": content.get("sourceLink")
    }

@router.put("/serbian-story")
async def update_serbian_story_content(
    data: SerbianStoryContent,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Update Serbian story content"""
    db = request.app.state.db
    
    await db.content.update_one(
        {"pageId": "serbian-story"},
        {"$set": {"content": data.content, "sourceLink": data.sourceLink, "updatedAt": datetime.utcnow(), "updatedBy": admin["_id"]}},
        upsert=True
    )
    
    return {"success": True}

@router.post("/serbian-story/upload-image")
async def upload_serbian_story_image(
    file: UploadFile = File(...),
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Upload main image for Serbian story"""
    db = request.app.state.db
    
    upload_dir = Path("/app/uploads/content")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_ext = Path(file.filename).suffix.lower()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"serbian_story_{timestamp}{file_ext}"
    file_path = upload_dir / safe_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    file_url = f"/api/content/file/{safe_filename}"
    
    # Update story with image URL
    await db.content.update_one(
        {"pageId": "serbian-story"},
        {"$set": {"imageUrl": file_url, "updatedAt": datetime.utcnow()}},
        upsert=True
    )
    
    return {"success": True, "imageUrl": file_url}

@router.get("/file/{filename}")
async def get_content_file(filename: str):
    """Serve content file"""
    from fastapi.responses import FileResponse
    file_path = Path("/app/uploads/content") / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(path=str(file_path))
