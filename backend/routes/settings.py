from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime

from models import SettingsBase
from dependencies import get_admin_user
from utils.cache import cache, settings_key, CACHE_TTL

router = APIRouter()

# Default hero backgrounds - Serbian-Swedish fusion patterns
DEFAULT_HERO_BACKGROUNDS = [
    {
        "id": "serbian_nemanjic_1",
        "name": "Nemanjić Dynasty - Elegant Ribbon",
        "url": "https://static.prod-images.emergentagent.com/jobs/912f6a5f-72f1-48e7-83f3-67436c52fa1c/images/2e2cc22b822d404f49e921fc571d5b5104a4cdfc089588c23bc6af341e34c02d.png",
        "description": "Serbian coat of arms with flag ribbon and golden fleur-de-lys"
    },
    {
        "id": "serbian_nemanjic_2",
        "name": "Nemanjić Dynasty - Royal Frame",
        "url": "https://static.prod-images.emergentagent.com/jobs/912f6a5f-72f1-48e7-83f3-67436c52fa1c/images/0e43eb7909b6528221309751e09ce2d6d7f7549dc1bfe1590f6a7099fe6b0f4e.png",
        "description": "Royal design with Serbian crosses in corners and golden frame"
    },
    {
        "id": "serbian_nemanjic_3",
        "name": "Nemanjić Dynasty - Watercolor",
        "url": "https://static.prod-images.emergentagent.com/jobs/912f6a5f-72f1-48e7-83f3-67436c52fa1c/images/3233c779b5663f71e2a62d510b59bdc8a7b37f286fc59b5264cfde66a7c34a8d.png",
        "description": "Watercolor style with ornate golden Nemanjić decorations"
    },
    {
        "id": "serbian_swedish_1",
        "name": "Serbian-Swedish Folk Art Fusion",
        "url": "https://static.prod-images.emergentagent.com/jobs/912f6a5f-72f1-48e7-83f3-67436c52fa1c/images/55748851d8f8eae040b3b350010e2fd2d49583edf32844dafdb8fa5af6ff5d63.png",
        "description": "Elegant pattern with Serbian geometric diamonds and Swedish Dala floral elements"
    },
    {
        "id": "serbian_swedish_2", 
        "name": "Cultural Heritage Pattern",
        "url": "https://static.prod-images.emergentagent.com/jobs/912f6a5f-72f1-48e7-83f3-67436c52fa1c/images/00d305c9d7506067bfb941e1cb48738a1aeff07fdf2586daee6c638dd66097da.png",
        "description": "Traditional Serbian embroidery meets Swedish folk art with roses and geometric shapes"
    },
    {
        "id": "logo_pattern",
        "name": "Logo Pattern",
        "url": "/logo.jpg",
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
        "opacity": 0.10,
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