from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse
from datetime import datetime
from pathlib import Path
import shutil

from models import GalleryCreate, GalleryResponse
from dependencies import get_admin_user

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

@router.post("/{gallery_id}/upload-image")
async def upload_gallery_image(
    gallery_id: str,
    file: UploadFile = File(...),
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Upload image to gallery (Admin only)"""
    db = request.app.state.db
    upload_dir = request.app.state.upload_dir
    
    # Save file
    file_path = upload_dir / "gallery" / f"{gallery_id}_{file.filename}"
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Add image URL to gallery
    image_url = f"/api/files/gallery/{file_path.name}"
    await db.gallery.update_one(
        {"_id": gallery_id},
        {"$push": {"images": image_url}}
    )
    
    return {"success": True, "imageUrl": image_url}

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