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
    event_dict["participants"] = []  # Users who confirmed attendance (RSVP)
    event_dict["attendance"] = {}    # Actual attendance: {userId: {attended: bool, markedAt: datetime, markedBy: str}}
    event_dict["createdAt"] = datetime.utcnow()
    
    await db.events.insert_one(event_dict)
    
    return EventResponse(**{**event_dict, "id": event_dict["_id"]})


# ==================== ATTENDANCE REPORTS ====================
# NOTE: These routes MUST be defined BEFORE any /{event_id} routes
# to prevent FastAPI from matching "reports" as an event_id

@router.get("/reports/attendance")
async def generate_attendance_report(
    request: Request,
    start_date: str = None,
    end_date: str = None,
    training_group: str = None,
    event_id: str = None,
    format: str = "pdf",
    admin: dict = Depends(get_admin_user)
):
    """
    Generate attendance report in PDF or Excel format
    
    Query params:
        - start_date: Start date (YYYY-MM-DD), defaults to 30 days ago
        - end_date: End date (YYYY-MM-DD), defaults to today
        - training_group: Filter by training group (optional)
        - event_id: Generate report for specific event (optional)
        - format: 'pdf' or 'excel'
    """
    from fastapi.responses import Response
    from utils.attendance_report_generator import generate_attendance_pdf_report, generate_attendance_excel_report
    from datetime import timedelta
    
    db = request.app.state.db
    
    # If event_id is provided, generate single-event report
    if event_id:
        event = await db.events.find_one({"_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        events = [event]
        start_date = event.get("date", datetime.utcnow().strftime('%Y-%m-%d'))
        end_date = start_date
    else:
        # Default date range: last 30 days
        if not end_date:
            end_date = datetime.utcnow().strftime('%Y-%m-%d')
        if not start_date:
            start_date = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
        
        # Build query
        query = {
            "date": {"$gte": start_date, "$lte": end_date}
        }
        if training_group and training_group != "all":
            query["trainingGroup"] = training_group
        
        # Fetch events
        events_cursor = db.events.find(query).sort("date", 1)
        events = await events_cursor.to_list(length=500)
    
    # Fetch all users for member lookup
    users_cursor = db.users.find()
    users = await users_cursor.to_list(length=1000)
    users_dict = {u["_id"]: u for u in users}
    
    # Process events data
    events_data = []
    member_stats = {}  # userId -> stats
    
    total_present = 0
    total_absent = 0
    total_walkins = 0
    
    for event in events:
        participants = event.get("participants", [])
        attendance = event.get("attendance", {})
        
        present_count = 0
        absent_count = 0
        walkin_count = 0
        
        # Count attendance
        for user_id in participants:
            att = attendance.get(user_id, {})
            attended = att.get("attended")
            
            # Initialize member stats
            if user_id not in member_stats:
                user = users_dict.get(user_id, {})
                member_stats[user_id] = {
                    "name": user.get("fullName", "Unknown"),
                    "email": user.get("email", ""),
                    "training_group": user.get("trainingGroup", "-"),
                    "total_rsvps": 0,
                    "total_present": 0,
                    "total_absent": 0,
                    "attendance_rate": 0
                }
            
            member_stats[user_id]["total_rsvps"] += 1
            
            if attended is True:
                present_count += 1
                member_stats[user_id]["total_present"] += 1
            elif attended is False:
                absent_count += 1
                member_stats[user_id]["total_absent"] += 1
        
        # Count walk-ins (attended but not in participants)
        for user_id, att in attendance.items():
            if user_id not in participants and att.get("attended"):
                walkin_count += 1
                if user_id not in member_stats:
                    user = users_dict.get(user_id, {})
                    member_stats[user_id] = {
                        "name": user.get("fullName", "Unknown"),
                        "email": user.get("email", ""),
                        "training_group": user.get("trainingGroup", "-"),
                        "total_rsvps": 0,
                        "total_present": 1,
                        "total_absent": 0,
                        "attendance_rate": 100
                    }
                else:
                    member_stats[user_id]["total_present"] += 1
        
        total_present += present_count + walkin_count
        total_absent += absent_count
        total_walkins += walkin_count
        
        events_data.append({
            "date": event.get("date", "N/A"),
            "title": event.get("title", {}).get("sr", event.get("title", {}).get("en", "Event")),
            "training_group": event.get("trainingGroup", "-"),
            "confirmed": len(participants),
            "present": present_count,
            "absent": absent_count,
            "walkin": walkin_count
        })
    
    # Calculate member attendance rates
    members_data = []
    for user_id, stats in member_stats.items():
        if stats["total_rsvps"] > 0:
            stats["attendance_rate"] = (stats["total_present"] / stats["total_rsvps"]) * 100
        members_data.append(stats)
    
    # Calculate overall stats
    total_confirmed = sum(e.get("confirmed", 0) for e in events_data)
    avg_attendance = 0
    if total_confirmed > 0:
        avg_attendance = (total_present / total_confirmed) * 100
    
    report_data = {
        "summary": {
            "total_events": len(events_data),
            "total_members": len(members_data),
            "average_attendance_rate": avg_attendance,
            "total_present": total_present,
            "total_absent": total_absent,
            "total_walkins": total_walkins
        },
        "events": events_data,
        "members": members_data,
        "date_range": {
            "start": start_date,
            "end": end_date
        },
        "training_group": training_group or "Sve grupe / All groups",
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": admin.get("fullName", admin.get("username", "Admin"))
    }
    
    # Generate report in requested format
    if format.lower() == "excel":
        try:
            excel_bytes = generate_attendance_excel_report(report_data)
            filename = f"attendance_report_{start_date}_{end_date}.xlsx"
            
            return Response(
                content=excel_bytes,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        except Exception as e:
            logger.error(f"Failed to generate Excel report: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate Excel report: {str(e)}")
    else:
        try:
            pdf_bytes = generate_attendance_pdf_report(report_data)
            filename = f"attendance_report_{start_date}_{end_date}.pdf"
            
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"inline; filename={filename}"}
            )
        except Exception as e:
            logger.error(f"Failed to generate PDF report: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(e)}")


@router.get("/reports/attendance/data")
async def get_attendance_report_data(
    request: Request,
    start_date: str = None,
    end_date: str = None,
    training_group: str = None,
    event_id: str = None,
    admin: dict = Depends(get_admin_user)
):
    """
    Get attendance report data as JSON (for preview before download)
    """
    from datetime import timedelta
    
    db = request.app.state.db
    
    # If event_id is provided, get single event data
    if event_id:
        event = await db.events.find_one({"_id": event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        events = [event]
        start_date = event.get("date", datetime.utcnow().strftime('%Y-%m-%d'))
        end_date = start_date
    else:
        # Default date range: last 30 days
        if not end_date:
            end_date = datetime.utcnow().strftime('%Y-%m-%d')
        if not start_date:
            start_date = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
        
        # Build query
        query = {
            "date": {"$gte": start_date, "$lte": end_date}
        }
        if training_group and training_group != "all":
            query["trainingGroup"] = training_group
        
        # Fetch events
        events_cursor = db.events.find(query).sort("date", 1)
        events = await events_cursor.to_list(length=500)
    
    # Fetch all users
    users_cursor = db.users.find()
    users = await users_cursor.to_list(length=1000)
    users_dict = {u["_id"]: u for u in users}
    
    # Get unique training groups
    training_groups = await db.events.distinct("trainingGroup")
    training_groups = [g for g in training_groups if g]
    
    # Process stats
    total_present = 0
    total_absent = 0
    total_walkins = 0
    total_confirmed = 0
    
    for event in events:
        participants = event.get("participants", [])
        attendance = event.get("attendance", {})
        total_confirmed += len(participants)
        
        for user_id in participants:
            att = attendance.get(user_id, {})
            if att.get("attended") is True:
                total_present += 1
            elif att.get("attended") is False:
                total_absent += 1
        
        for user_id, att in attendance.items():
            if user_id not in participants and att.get("attended"):
                total_walkins += 1
                total_present += 1
    
    avg_attendance = 0
    if total_confirmed > 0:
        avg_attendance = (total_present / total_confirmed) * 100
    
    return {
        "summary": {
            "total_events": len(events),
            "total_confirmed": total_confirmed,
            "total_present": total_present,
            "total_absent": total_absent,
            "total_walkins": total_walkins,
            "average_attendance_rate": round(avg_attendance, 1)
        },
        "date_range": {
            "start": start_date,
            "end": end_date
        },
        "training_groups": training_groups
    }


# ==================== EVENT CRUD ====================

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
                    text,
                    db=db
                )
                
                # Also send to parent email if exists
                if user.get("parentEmail"):
                    await send_email(user["parentEmail"], "Otkazivanje treninga / Träningsinställning", html, text, db=db)
    
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
    
    # Find moderator for this training group
    from email_service import send_email, get_admin_event_participation_notification
    
    training_group = event.get("trainingGroup")
    notify_emails = ["info@srpskoudruzenjetaby.se"]  # Default admin
    
    if training_group:
        # Find moderators assigned to this training group
        moderators = await db.users.find({
            "role": {"$in": ["moderator", "admin", "superadmin"]},
            "trainingGroups": training_group
        }).to_list(length=10)
        
        if moderators:
            notify_emails = [m.get("email") for m in moderators if m.get("email")]
        
    try:
        admin_html, admin_text = get_admin_event_participation_notification(
            user_name=current_user.get("fullName", current_user.get("email")),
            user_email=current_user.get("email"),
            event_title=event["title"].get("en", "Event"),
            event_date=event["date"],
            event_time=event["time"],
            action="confirmed",
            training_group=training_group
        )
        
        for email in notify_emails:
            await send_email(
                email,
                "✓ Potvrđeno Učešće / Bekräftat Deltagande - SKUD Täby",
                admin_html,
                admin_text,
                db=db
            )
    except Exception as e:
        logger.error(f"Failed to send participation notification: {str(e)}")
    
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
    
    # Find moderator for this training group
    from email_service import send_email, get_admin_event_participation_notification
    
    training_group = event.get("trainingGroup")
    notify_emails = ["info@srpskoudruzenjetaby.se"]  # Default admin
    
    if training_group:
        # Find moderators assigned to this training group
        moderators = await db.users.find({
            "role": {"$in": ["moderator", "admin", "superadmin"]},
            "trainingGroups": training_group
        }).to_list(length=10)
        
        if moderators:
            notify_emails = [m.get("email") for m in moderators if m.get("email")]
    
    try:
        admin_html, admin_text = get_admin_event_participation_notification(
            user_name=current_user.get("fullName", current_user.get("email")),
            user_email=current_user.get("email"),
            event_title=event["title"].get("en", "Event"),
            event_date=event["date"],
            event_time=event["time"],
            action="cancelled",
            reason=reason,
            training_group=training_group
        )
        
        for email in notify_emails:
            await send_email(
                email,
                "✗ Otkazano Učešće / Avbokad Deltagande - SKUD Täby",
                admin_html,
                admin_text,
                db=db
            )
    except Exception as e:
        logger.error(f"Failed to send cancellation notification: {str(e)}")
    
    return {"success": True, "confirmed": False}

@router.get("/{event_id}/participants")
async def get_participants(
    event_id: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Get list of confirmed participants with attendance status (Admin only)"""
    db = request.app.state.db
    
    event = await db.events.find_one({"_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    participant_ids = event.get("participants", [])
    attendance_data = event.get("attendance", {})
    participants = await db.users.find({"_id": {"$in": participant_ids}}).to_list(length=None)
    
    return {
        "participants": [
            {
                "id": p["_id"],
                "fullName": p.get("fullName"),
                "email": p.get("email"),
                "confirmed": True,  # They're in participants list
                "attended": attendance_data.get(p["_id"], {}).get("attended"),
                "attendanceMarkedAt": attendance_data.get(p["_id"], {}).get("markedAt"),
                "attendanceMarkedBy": attendance_data.get(p["_id"], {}).get("markedBy")
            }
            for p in participants
        ],
        "eventDate": event.get("date"),
        "eventTime": event.get("time"),
        "eventTitle": event.get("title", {}).get("en", "Event")
    }


# ==================== ATTENDANCE TRACKING ====================

@router.post("/{event_id}/attendance/{user_id}")
async def mark_attendance(
    event_id: str,
    user_id: str,
    attended: bool = True,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """
    Mark whether a user actually attended the training/event
    Admin/SuperAdmin/Moderator only
    """
    db = request.app.state.db
    
    event = await db.events.find_one({"_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Verify user exists - if not, remove from participants and return success
    user = await db.users.find_one({"_id": user_id})
    if not user:
        # User was deleted - clean up the participant list
        if user_id in event.get("participants", []):
            await db.events.update_one(
                {"_id": event_id},
                {"$pull": {"participants": user_id}}
            )
            logger.info(f"Removed deleted user {user_id} from event {event_id} participants")
        return {
            "success": True,
            "userId": user_id,
            "attended": None,
            "message": "User no longer exists - removed from participants"
        }
    
    # Mark attendance
    attendance_record = {
        "attended": attended,
        "markedAt": datetime.utcnow().isoformat(),
        "markedBy": admin.get("fullName", admin.get("username", "Admin"))
    }
    
    await db.events.update_one(
        {"_id": event_id},
        {"$set": {f"attendance.{user_id}": attendance_record}}
    )
    
    return {
        "success": True,
        "userId": user_id,
        "attended": attended,
        "message": f"Attendance marked: {'Present' if attended else 'Absent'}"
    }


@router.post("/{event_id}/attendance/bulk")
async def mark_bulk_attendance(
    event_id: str,
    request: Request,
    admin: dict = Depends(get_admin_user)
):
    """
    Mark attendance for multiple users at once
    Body: { "attendance": { "userId1": true, "userId2": false, ... } }
    """
    db = request.app.state.db
    body = await request.json()
    
    event = await db.events.find_one({"_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    attendance_updates = body.get("attendance", {})
    marked_by = admin.get("fullName", admin.get("username", "Admin"))
    marked_at = datetime.utcnow().isoformat()
    
    update_dict = {}
    for user_id, attended in attendance_updates.items():
        update_dict[f"attendance.{user_id}"] = {
            "attended": attended,
            "markedAt": marked_at,
            "markedBy": marked_by
        }
    
    if update_dict:
        await db.events.update_one(
            {"_id": event_id},
            {"$set": update_dict}
        )
    
    return {
        "success": True,
        "marked": len(update_dict),
        "message": f"Attendance updated for {len(update_dict)} users"
    }


@router.get("/{event_id}/attendance")
async def get_attendance(
    event_id: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """
    Get full attendance data for an event including:
    - Users who confirmed (RSVP) and their actual attendance
    - Walk-ins (attended but didn't confirm)
    """
    db = request.app.state.db
    
    event = await db.events.find_one({"_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    participant_ids = event.get("participants", [])
    attendance_data = event.get("attendance", {})
    
    # Get all users who either confirmed or have attendance marked
    all_user_ids = list(set(participant_ids + list(attendance_data.keys())))
    users = await db.users.find({"_id": {"$in": all_user_ids}}).to_list(length=None)
    users_dict = {u["_id"]: u for u in users}
    
    attendance_list = []
    stats = {"confirmed": 0, "attended": 0, "noShow": 0, "walkIn": 0, "pending": 0}
    deleted_user_ids = []
    
    for user_id in all_user_ids:
        user = users_dict.get(user_id)
        
        # Track deleted users for cleanup
        if not user:
            deleted_user_ids.append(user_id)
            continue  # Skip deleted users
            
        confirmed = user_id in participant_ids
        att = attendance_data.get(user_id, {})
        attended = att.get("attended")
        
        # Calculate status
        if confirmed and attended is True:
            status = "attended"
            stats["attended"] += 1
            stats["confirmed"] += 1
        elif confirmed and attended is False:
            status = "noShow"
            stats["noShow"] += 1
            stats["confirmed"] += 1
        elif confirmed and attended is None:
            status = "pending"
            stats["pending"] += 1
            stats["confirmed"] += 1
        elif not confirmed and attended is True:
            status = "walkIn"
            stats["walkIn"] += 1
            stats["attended"] += 1
        else:
            continue  # Skip users with no relevant data
        
        attendance_list.append({
            "userId": user_id,
            "fullName": user.get("fullName", "Unknown"),
            "email": user.get("email", ""),
            "confirmed": confirmed,
            "attended": attended,
            "status": status,
            "markedAt": att.get("markedAt"),
            "markedBy": att.get("markedBy")
        })
    
    # Clean up deleted users from participants list
    if deleted_user_ids:
        await db.events.update_one(
            {"_id": event_id},
            {"$pull": {"participants": {"$in": deleted_user_ids}}}
        )
        logger.info(f"Cleaned up {len(deleted_user_ids)} deleted users from event {event_id}")
    
    return {
        "eventId": event_id,
        "eventTitle": event.get("title", {}).get("en", "Event"),
        "eventDate": event.get("date"),
        "eventTime": event.get("time"),
        "attendance": attendance_list,
        "stats": stats
    }


@router.post("/{event_id}/attendance/walkin/{user_id}")
async def mark_walkin_attendance(
    event_id: str,
    user_id: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """
    Mark a user as walk-in attendance (didn't RSVP but showed up)
    """
    db = request.app.state.db
    
    event = await db.events.find_one({"_id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Mark as attended (walk-in)
    attendance_record = {
        "attended": True,
        "markedAt": datetime.utcnow().isoformat(),
        "markedBy": admin.get("fullName", admin.get("username", "Admin")),
        "walkIn": True
    }
    
    await db.events.update_one(
        {"_id": event_id},
        {"$set": {f"attendance.{user_id}": attendance_record}}
    )
    
    return {
        "success": True,
        "userId": user_id,
        "message": f"Walk-in attendance marked for {user.get('fullName')}"
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