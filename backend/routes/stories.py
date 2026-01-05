from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse
from datetime import datetime
from pathlib import Path
import shutil
import logging

from models import StoryCreate, StoryResponse
from dependencies import get_admin_user
from services.cloudinary_service import CloudinaryService, is_cloudinary_configured

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/")
async def get_stories(request: Request):
    """Get all Serbian stories"""
    db = request.app.state.db
    cursor = db.stories.find().sort("date", -1)
    stories_list = await cursor.to_list(length=100)
    
    return {
        "stories": [{**item, "id": str(item["_id"])} for item in stories_list]
    }

@router.post("/", response_model=StoryResponse)
async def create_story(
    story: StoryCreate,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Create story (Admin only)"""
    db = request.app.state.db
    story_dict = story.dict()
    story_dict["_id"] = f"story_{int(datetime.utcnow().timestamp() * 1000)}"
    story_dict["createdAt"] = datetime.utcnow()
    
    await db.stories.insert_one(story_dict)
    
    return StoryResponse(**{**story_dict, "id": story_dict["_id"]})

@router.put("/{story_id}")
async def update_story(
    story_id: str,
    story_update: StoryCreate,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Update story (Admin only)"""
    db = request.app.state.db
    result = await db.stories.update_one(
        {"_id": story_id},
        {"$set": story_update.dict()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Story not found")
    
    return {"success": True, "message": "Story updated successfully"}

@router.delete("/{story_id}")
async def delete_story(
    story_id: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Delete story (Admin only)"""
    db = request.app.state.db
    result = await db.stories.delete_one({"_id": story_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Story not found")
    
    return {"success": True, "message": "Story deleted successfully"}

@router.post("/upload-image")
async def upload_story_image(
    file: UploadFile = File(...),
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Upload image for story (Admin only) - Uses Cloudinary for persistent storage"""
    # Validate file type
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"File type {file_ext} not allowed. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Check if Cloudinary is configured
    if is_cloudinary_configured():
        try:
            # Read file content
            file_content = await file.read()
            
            # Upload to Cloudinary
            result = await CloudinaryService.upload_image(
                file_content=file_content,
                filename=file.filename,
                content_type="stories"
            )
            
            logger.info(f"Story image uploaded to Cloudinary: {result['secure_url']}")
            
            return {
                "success": True, 
                "imageUrl": result['secure_url'],
                "cloudinaryId": result['public_id']
            }
            
        except Exception as e:
            logger.error(f"Cloudinary upload failed, falling back to local storage: {e}")
            # Fall back to local storage if Cloudinary fails
            await file.seek(0)
    
    # Fallback to local storage
    upload_dir = Path("/app/uploads/stories")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"story_{timestamp}{file_ext}"
    file_path = upload_dir / safe_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    file_url = f"/api/stories/images/{safe_filename}"
    
    return {"success": True, "imageUrl": file_url}

@router.get("/images/{filename}")
async def get_story_image(filename: str):
    """Serve story image (for locally stored images)"""
    file_path = Path("/app/uploads/stories") / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(path=str(file_path))