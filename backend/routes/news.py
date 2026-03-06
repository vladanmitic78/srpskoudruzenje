from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse, Response
from typing import List
from datetime import datetime
from pathlib import Path
import shutil

from models import NewsCreate, NewsResponse
from dependencies import get_admin_user
from utils.image_optimizer import optimize_image_bytes

router = APIRouter()

@router.get("/")
async def get_news(limit: int = 10, skip: int = 0, request: Request = None):
    """Get all news articles"""
    db = request.app.state.db
    cursor = db.news.find().sort("createdAt", -1).skip(skip).limit(limit)
    news_list = await cursor.to_list(length=limit)
    total = await db.news.count_documents({})
    
    return {
        "news": [{**item, "id": str(item["_id"])} for item in news_list],
        "total": total
    }

@router.post("/", response_model=NewsResponse)
async def create_news(news: NewsCreate, admin: dict = Depends(get_admin_user), request: Request = None):
    """Create news article (Admin only)"""
    db = request.app.state.db
    news_dict = news.dict()
    news_dict["_id"] = f"news_{int(datetime.utcnow().timestamp() * 1000)}"
    news_dict["createdAt"] = datetime.utcnow()
    
    await db.news.insert_one(news_dict)
    
    return NewsResponse(**{**news_dict, "id": news_dict["_id"]})

@router.put("/{news_id}")
async def update_news(
    news_id: str,
    news_update: NewsCreate,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Update news article (Admin only)"""
    db = request.app.state.db
    result = await db.news.update_one(
        {"_id": news_id},
        {"$set": news_update.dict()}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="News not found")
    
    return {"success": True, "message": "News updated successfully"}

@router.delete("/{news_id}")
async def delete_news(news_id: str, admin: dict = Depends(get_admin_user), request: Request = None):
    """Delete news article (Admin only)"""
    db = request.app.state.db
    result = await db.news.delete_one({"_id": news_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="News not found")
    
    return {"success": True, "message": "News deleted successfully"}

@router.post("/upload-image")
async def upload_news_image(
    file: UploadFile = File(...),
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Upload and optimize image for news article (Admin only)"""
    # Validate file type
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"File type {file_ext} not allowed. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Create uploads directory
    upload_dir = Path("/app/uploads/news")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Read file bytes
    file_bytes = await file.read()
    
    # Optimize image (convert to WebP, resize, compress)
    try:
        optimized_bytes, new_filename, stats = optimize_image_bytes(
            image_bytes=file_bytes,
            filename=file.filename,
            max_width=1200,  # Max width for news images
            max_height=900,  # Max height
            quality=80,      # Good quality with compression
            convert_to_webp=True
        )
    except Exception:
        # Fallback to original if optimization fails
        optimized_bytes = file_bytes
        new_filename = file.filename
        stats = {'savings_percent': 0}
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    ext = Path(new_filename).suffix
    safe_filename = f"news_{timestamp}{ext}"
    file_path = upload_dir / safe_filename
    
    # Save optimized file
    with open(file_path, "wb") as buffer:
        buffer.write(optimized_bytes)
    
    # Return URL
    file_url = f"/api/news/images/{safe_filename}"
    
    return {
        "success": True, 
        "imageUrl": file_url,
        "optimized": True,
        "savings": f"{stats.get('savings_percent', 0)}%"
    }


@router.get("/images/{filename}")
async def get_news_image(filename: str):
    """Serve news image with cache headers"""
    file_path = Path("/app/uploads/news") / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Determine content type
    ext = file_path.suffix.lower()
    content_types = {
        '.webp': 'image/webp',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif'
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    # Read file and return with cache headers
    with open(file_path, 'rb') as f:
        content = f.read()
    
    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",  # 1 year cache
            "Vary": "Accept-Encoding"
        }
    )