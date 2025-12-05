from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse
from datetime import datetime
from pathlib import Path
import shutil
import logging

from models import GalleryCreate, GalleryResponse
from dependencies import get_admin_user
from utils.media_optimizer import optimize_uploaded_file

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/")
async def get_gallery(request: Request):
    """Get all gallery items"""
    db = request.app.state.db
    cursor = db.gallery.find().sort("date", -1)
    gallery_list = await cursor.to_list(length=100)
    
    return {
        "items": [{**item, "id": str(item["_id"])} for item in gallery_list]
    }

@router.post("/", response_model=GalleryResponse)
async def create_gallery_item(
    gallery: GalleryCreate,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Create gallery item (Admin only)"""
    db = request.app.state.db
    gallery_dict = gallery.dict()
    gallery_dict["_id"] = f"gallery_{int(datetime.utcnow().timestamp() * 1000)}"
    gallery_dict["createdAt"] = datetime.utcnow()
    
    await db.gallery.insert_one(gallery_dict)
    
    return GalleryResponse(**{**gallery_dict, "id": gallery_dict["_id"]})

@router.put("/{gallery_id}")
async def update_gallery_item(
    gallery_id: str,
    gallery_update: GalleryCreate,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Update gallery album (Admin only)"""
    db = request.app.state.db
    
    # Prepare update data, excluding images and videos to preserve uploaded content
    update_data = gallery_update.dict(exclude_unset=True)
    # Never update images/videos via this endpoint - use upload/delete endpoints instead
    update_data.pop('images', None)
    update_data.pop('videos', None)
    
    result = await db.gallery.update_one(
        {"_id": gallery_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    
    return {"success": True, "message": "Gallery updated successfully"}

@router.post("/{gallery_id}/upload-image")
async def upload_gallery_image(
    gallery_id: str,
    file: UploadFile = File(...),
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Upload image to gallery album (Admin only)"""
    db = request.app.state.db
    
    # Validate file type
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"File type {file_ext} not allowed. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Create uploads directory
    upload_dir = Path("/app/uploads/gallery")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    safe_filename = f"{gallery_id}_{timestamp}{file_ext}"
    file_path = upload_dir / safe_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Add image URL to gallery
    image_url = f"/api/gallery/images/{safe_filename}"
    await db.gallery.update_one(
        {"_id": gallery_id},
        {"$push": {"images": image_url}}
    )
    
    return {"success": True, "imageUrl": image_url}

@router.delete("/{gallery_id}/image")
async def delete_gallery_image(
    gallery_id: str,
    image_url: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Delete image from gallery album (Admin only)"""
    db = request.app.state.db
    
    # Remove image URL from gallery
    await db.gallery.update_one(
        {"_id": gallery_id},
        {"$pull": {"images": image_url}}
    )
    
    # Try to delete file if it's a local upload
    if "/api/gallery/images/" in image_url:
        filename = image_url.split("/")[-1]
        file_path = Path("/app/uploads/gallery") / filename
        if file_path.exists():
            file_path.unlink()
    
    return {"success": True, "message": "Image deleted successfully"}

@router.get("/images/{filename}")
async def get_gallery_image(filename: str):
    """Serve gallery image"""
    file_path = Path("/app/uploads/gallery") / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(path=str(file_path))

@router.delete("/{gallery_id}")
async def delete_gallery_item(
    gallery_id: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Delete gallery item (Admin only)"""
    db = request.app.state.db
    result = await db.gallery.delete_one({"_id": gallery_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    
    return {"success": True, "message": "Gallery item deleted successfully"}