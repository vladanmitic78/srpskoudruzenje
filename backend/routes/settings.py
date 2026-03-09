from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from datetime import datetime
from pathlib import Path

from models import SettingsBase
from dependencies import get_admin_user
from utils.cache import cache, settings_key, CACHE_TTL

router = APIRouter()

# Default hero backgrounds - Serbian-Swedish fusion patterns
# Optimized WebP versions stored locally for better performance
DEFAULT_HERO_BACKGROUNDS = [
    {
        "id": "serbian_nemanjic_1",
        "name": "Nemanjić Dynasty - Elegant Ribbon",
        "url": "/api/settings/hero-images/serbian_nemanjic_1.webp",
        "description": "Serbian coat of arms with flag ribbon and golden fleur-de-lys"
    },
    {
        "id": "serbian_nemanjic_2",
        "name": "Nemanjić Dynasty - Royal Frame",
        "url": "/api/settings/hero-images/serbian_nemanjic_2.webp",
        "description": "Royal design with Serbian crosses in corners and golden frame"
    },
    {
        "id": "serbian_nemanjic_3",
        "name": "Nemanjić Dynasty - Watercolor",
        "url": "/api/settings/hero-images/serbian_nemanjic_3.webp",
        "description": "Watercolor style with ornate golden Nemanjić decorations"
    },
    {
        "id": "serbian_swedish_1",
        "name": "Serbian-Swedish Folk Art Fusion",
        "url": "/api/settings/hero-images/serbian_swedish_1.webp",
        "description": "Elegant pattern with Serbian geometric diamonds and Swedish Dala floral elements"
    },
    {
        "id": "serbian_swedish_2", 
        "name": "Cultural Heritage Pattern",
        "url": "/api/settings/hero-images/serbian_swedish_2.webp",
        "description": "Traditional Serbian embroidery meets Swedish folk art with roses and geometric shapes"
    },
    {
        "id": "logo_pattern",
        "name": "Logo Pattern",
        "url": "/logo.webp",
        "description": "Subtle repeating logo pattern"
    },
    {
        "id": "solid_gradient",
        "name": "Solid Gradient",
        "url": "",
        "description": "Clean gradient without pattern"
    }
]

@router.get("/hero-background")
async def get_hero_background(request: Request):
    """Get hero background settings (public) - for homepage"""
    db = request.app.state.db
    
    settings = await db.branding_settings.find_one({"_id": "branding"})
    
    default_hero = {
        "type": "pattern",
        "selectedId": "serbian_nemanjic_1",
        "customUrl": "",
        "opacity": 0.35,
        "availableBackgrounds": DEFAULT_HERO_BACKGROUNDS
    }
    
    if not settings or "heroBackground" not in settings:
        hero = default_hero
    else:
        hero = settings.get("heroBackground", default_hero)
        hero["availableBackgrounds"] = DEFAULT_HERO_BACKGROUNDS
    
    # Get the URL based on selection
    selected_id = hero.get("selectedId", "serbian_swedish_2")
    hero["backgroundUrl"] = ""
    
    if hero.get("type") == "custom" and hero.get("customUrl"):
        hero["backgroundUrl"] = hero["customUrl"]
    else:
        for bg in DEFAULT_HERO_BACKGROUNDS:
            if bg["id"] == selected_id:
                hero["backgroundUrl"] = bg["url"]
                break
    
    return hero


@router.get("/hero-images/{filename}")
async def get_hero_image(filename: str):
    """Serve optimized hero background images with cache headers"""
    # Validate filename to prevent path traversal
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = Path("/app/backend/uploads/hero") / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Determine content type
    ext = file_path.suffix.lower()
    content_types = {
        '.webp': 'image/webp',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    # Read file and return with long cache headers
    with open(file_path, 'rb') as f:
        content = f.read()
    
    return Response(
        content=content,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "Vary": "Accept-Encoding"
        }
    )


@router.get("/")
async def get_settings(request: Request):
    """Get association settings (public) - with caching"""
    # Check cache first
    cached = await cache.get(settings_key())
    if cached:
        return cached
    
    db = request.app.state.db
    settings = await db.settings.find_one({})
    
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    # Remove _id from response
    settings.pop("_id", None)
    settings.pop("updatedAt", None)
    
    # Cache the result
    await cache.set(settings_key(), settings, CACHE_TTL['settings'])
    
    return settings

@router.put("/")
async def update_settings(
    settings_update: SettingsBase,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Update settings (Admin only)"""
    db = request.app.state.db
    
    update_data = settings_update.dict()
    update_data["updatedAt"] = datetime.utcnow()
    
    result = await db.settings.update_one(
        {},
        {"$set": update_data},
        upsert=True
    )
    
    # Invalidate cache
    await cache.delete(settings_key())
    
    return {"success": True, "message": "Settings updated successfully"}