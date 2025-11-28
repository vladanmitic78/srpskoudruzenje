from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime
from typing import List
import logging

from models import EventCreate, EventUpdate, EventResponse
from dependencies import get_admin_user, get_current_user
from email_service import send_email, get_cancellation_email_template

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/")
async def get_events(request: Request):
    """Get all events/trainings"""
    db = request.app.state.db
    cursor = db.events.find().sort("date", 1)
    events_list = await cursor.to_list(length=100)
    
    return {
        "events": [{**item, "id": str(item["_id"])} for item in events_list]
    }

@router.post("/", response_model=EventResponse)
async def create_event(event: EventCreate, admin: dict = Depends(get_admin_user), request: Request = None):
    """Create event/training (Admin only)"""
    db = request.app.state.db
    event_dict = event.dict()
    event_dict["_id"] = f"event_{int(datetime.utcnow().timestamp() * 1000)}"
    event_dict["participants"] = []
    event_dict["createdAt"] = datetime.utcnow()
    
    await db.events.insert_one(event_dict)
    
    return EventResponse(**{**event_dict, "id": event_dict["_id"]})

@router.put("/{event_id}")
async def update_event(
    event_id: str,
    event_update: EventUpdate,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Update or cancel event (Admin only)"""
    db = request.app.state.db
    update_data = event_update.dict(exclude_unset=True)
    
    # If cancelling, send emails to participants
    if update_data.get("status") == "cancelled":
        event = await db.events.find_one({"_id": event_id})
        if event and event.get("participants"):
            participants = await db.users.find({
                "_id": {"$in": event["participants"]}
            }).to_list(length=100)
            
            for user in participants:
                html, text = get_cancellation_email_template(
                    user["fullName"],
                    event["title"]["en"],
                    update_data.get("cancellationReason", "No reason provided")
                )
                await send_email(
                    user["email"],
                    "Otkazivanje treninga / Träningsinställning",
                    html,
                    text
                )
                
                # Also send to parent email if exists
                if user.get("parentEmail"):
                    await send_email(user["parentEmail"], "Otkazivanje treninga / Träningsinställning", html, text)
    
    result = await db.events.update_one(
        {"_id": event_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {"success": True, "message": "Event updated successfully"}

@router.post("/{event_id}/confirm")
async def confirm_participation(
    event_id: str,
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """User confirms participation"""
    db = request.app.state.db
    
    # Get event details for email
    event = await db.events.find_one({"_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    await db.events.update_one(
        {"_id": event_id},
        {"$addToSet": {"participants": current_user["_id"]}}
    )
    
    # Send admin notification email
    from email_service import send_email, get_admin_event_participation_notification
    admin_email = "info@srpskoudruzenjetaby.se"
    
    try:
        admin_html, admin_text = get_admin_event_participation_notification(
            user_name=current_user.get("fullName", current_user.get("email")),
            user_email=current_user.get("email"),
            event_title=event["title"].get("en", "Event"),
            event_date=event["date"],
            event_time=event["time"],
            action="confirmed"
        )
        await send_email(
            admin_email,
            "✓ Potvrđeno Učešće / Bekräftat Deltagande - SKUD Täby",
            admin_html,
            admin_text
        )
    except Exception as e:
        logger.error(f"Failed to send admin participation notification: {str(e)}")
    
    return {"success": True, "confirmed": True}

@router.delete("/{event_id}/confirm")
async def cancel_participation(
    event_id: str,
    reason: str = None,
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """User cancels participation with optional reason"""
    db = request.app.state.db
    
    # Get event details for email
    event = await db.events.find_one({"_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Track cancellation in cancellations array
    cancellation_record = {
        "userId": current_user["_id"],
        "reason": reason,
        "cancelledAt": datetime.utcnow().isoformat()
    }
    
    await db.events.update_one(
        {"_id": event_id},
        {
            "$pull": {"participants": current_user["_id"]},
            "$push": {"cancellations": cancellation_record}
        }
    )
    
    # Send admin notification email
    from email_service import send_email, get_admin_event_participation_notification
    admin_email = "info@srpskoudruzenjetaby.se"
    
    try:
        admin_html, admin_text = get_admin_event_participation_notification(
            user_name=current_user.get("fullName", current_user.get("email")),
            user_email=current_user.get("email"),
            event_title=event["title"].get("en", "Event"),
            event_date=event["date"],
            event_time=event["time"],
            action="cancelled",
            reason=reason
        )
        await send_email(
            admin_email,
            "✗ Otkazano Učešće / Avbokad Deltagande - SKUD Täby",
            admin_html,
            admin_text
        )
    except Exception as e:
        logger.error(f"Failed to send admin cancellation notification: {str(e)}")
    
    return {"success": True, "confirmed": False}

@router.get("/{event_id}/participants")
async def get_participants(
    event_id: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Get list of confirmed participants (Admin only)"""
    db = request.app.state.db
    
    event = await db.events.find_one({"_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    participant_ids = event.get("participants", [])
    participants = await db.users.find({"_id": {"$in": participant_ids}}).to_list(length=None)
    
    return {
        "participants": [
            {
                "id": p["_id"],
                "fullName": p.get("fullName"),
                "email": p.get("email")
            }
            for p in participants
        ]
    }


@router.get("/stats/my")
async def get_my_event_stats(
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """Get user's training statistics"""
    db = request.app.state.db
    user_id = current_user["_id"]
    
    # Get all events
    all_events = await db.events.find({"status": "active"}).to_list(length=None)
    
    # Total trainings available
    total_trainings = len(all_events)
    
    # Trainings attended (confirmed)
    attended = sum(1 for event in all_events if event.get("participants") and user_id in event["participants"])
    
    # Trainings cancelled (historical)
    cancelled = sum(
        1 for event in all_events 
        if event.get("cancellations") and any(c.get("userId") == user_id for c in event["cancellations"])
    )
    
    # Training groups (extract unique categories/types if available, otherwise use event types)
    # For now, we'll use unique locations as proxy for groups
    training_groups = len(set(event.get("location", "Unknown") for event in all_events))
    
    return {
        "totalTrainings": total_trainings,
        "attended": attended,
        "cancelled": cancelled,
        "trainingGroups": training_groups,
        "attendanceRate": round((attended / total_trainings * 100) if total_trainings > 0 else 0, 1)
    }

@router.delete("/{event_id}")
async def delete_event(event_id: str, admin: dict = Depends(get_admin_user), request: Request = None):
    """Delete event (Admin only)"""
    db = request.app.state.db
    result = await db.events.delete_one({"_id": event_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {"success": True, "message": "Event deleted successfully"}