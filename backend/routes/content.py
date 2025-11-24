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
