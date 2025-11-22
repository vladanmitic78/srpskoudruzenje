from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime

from models import SettingsBase
from dependencies import get_admin_user

router = APIRouter()

@router.get("/")
async def get_settings(request: Request):
    """Get association settings (public)"""
    db = request.app.state.db
    settings = await db.settings.find_one({})
    
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    # Remove _id from response
    settings.pop("_id", None)
    settings.pop("updatedAt", None)
    
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
    
    return {"success": True, "message": "Settings updated successfully"}