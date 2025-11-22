from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime

from models import StoryCreate, StoryResponse
from dependencies import get_admin_user

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