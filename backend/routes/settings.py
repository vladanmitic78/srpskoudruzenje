from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime

from models import SettingsBase
from dependencies import get_admin_user
from utils.cache import cache, settings_key, CACHE_TTL

router = APIRouter()

# Default hero backgrounds - Serbian-Swedish fusion patterns
DEFAULT_HERO_BACKGROUNDS = [
    {
        "id": "serbian_flag_1",
        "name": "Serbian Flag with Folk Art",
        "url": "https://static.prod-images.emergentagent.com/jobs/912f6a5f-72f1-48e7-83f3-67436c52fa1c/images/d2243371e0ec6b2ab6b4dffb395bad94466c877066f6023fae6877c3528ff92f.png",
        "description": "Serbian flag with traditional embroidery patterns and coat of arms"
    },
    {
        "id": "serbian_flag_2",
        "name": "Serbian Flag Diagonal Design",
        "url": "https://static.prod-images.emergentagent.com/jobs/912f6a5f-72f1-48e7-83f3-67436c52fa1c/images/531cc730ba67da35f94100a1a8839b6cdda60989e39cfccac3bbe8b70304b2d1.png",
        "description": "Modern diagonal Serbian flag with geometric folk art borders"
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
        "id": "serbian_swedish_3",
        "name": "Minimalist Heritage",
        "url": "https://static.prod-images.emergentagent.com/jobs/912f6a5f-72f1-48e7-83f3-67436c52fa1c/images/9ee671f18ccb4058f5f72e0edc473fa47f47629fdf06fd9bf22cbfa86372c5bf.png",
        "description": "Modern interpretation of Balkan and Nordic folk motifs"
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
        "opacity": 0.25,
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