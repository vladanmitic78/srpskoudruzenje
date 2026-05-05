"""
Background scheduler for automated tasks
- Send event reminder emails 1 day before the event
"""
import logging
from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from motor.motor_asyncio import AsyncIOMotorDatabase
from email_service import send_email, get_training_reminder_template, get_training_call_to_confirm_template

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = None


async def send_event_reminders(db: AsyncIOMotorDatabase):
    """
    Send reminder emails for events happening tomorrow:
    1. Confirmed participants get a reminder
    2. All other members in the training group get a "call to confirm" email
    """
    try:
        logger.info("Starting daily event reminder check...")
        
        # Calculate tomorrow's date (in UTC)
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).date()
        tomorrow_str = tomorrow.isoformat()
        
        logger.info(f"Checking for events on {tomorrow_str}")
        
        # Find all active events happening tomorrow
        events_cursor = db.events.find({
            "date": tomorrow_str,
            "status": "active"
        })
        events = await events_cursor.to_list(length=100)
        
        if not events:
            logger.info(f"No events found for {tomorrow_str}")
            return
        
        logger.info(f"Found {len(events)} event(s) for tomorrow")
        
        # Process each event
        total_emails_sent = 0
        for event in events:
            event_title_sr = event.get("title", {}).get("sr-latin", "Trening")
            event_title_sv = event.get("title", {}).get("sv", event_title_sr)
            event_date = event.get("date")
            event_time = event.get("time", "TBD")
            event_location = event.get("location", "TBD")
            participants = event.get("participants", [])
            cancellations = event.get("cancellations", [])
            cancelled_user_ids = [c.get("userId") for c in cancellations]
            training_group = event.get("trainingGroup")
            
            # 1. Send reminder to confirmed participants
            for participant_id in participants:
                try:
                    user = await db.users.find_one({"_id": participant_id})
                    
                    if not user:
                        logger.warning(f"User {participant_id} not found")
                        continue
                    
                    user_name = user.get("fullName", user.get("username", "Member"))
                    user_email = user.get("email")
                    
                    if not user_email:
                        # Check if it's a child - use parent email
                        parent_id = user.get("primaryAccountId")
                        if parent_id:
                            parent = await db.users.find_one({"_id": parent_id})
                            user_email = parent.get("email") if parent else None
                    
                    if not user_email:
                        logger.warning(f"User {participant_id} has no email address")
                        continue
                    
                    # Generate reminder email
                    html_content, text_content = get_training_reminder_template(
                        name=user_name,
                        event_title=event_title_sr,
                        event_title_sv=event_title_sv,
                        event_date=event_date,
                        event_time=event_time,
                        location=event_location
                    )
                    
                    # Send email
                    success = await send_email(
                        to_email=user_email,
                        subject=f"Podsetnik: {event_title_sr} - Sutra! / Påminnelse: {event_title_sv} - Imorgon!",
                        html_content=html_content,
                        text_content=text_content,
                        db=db
                    )
                    
                    if success:
                        total_emails_sent += 1
                        logger.info(f"✓ Reminder sent to {user_email} for event '{event_title_sr}'")
                    else:
                        logger.error(f"✗ Failed to send reminder to {user_email}")
                        
                except Exception as e:
                    logger.error(f"Error sending reminder to participant {participant_id}: {str(e)}")
                    continue
            
            # 2. Send "call to confirm" to members who haven't responded
            # Find all active users who are NOT in participants and NOT in cancellations
            query = {
                "role": {"$in": ["user", "admin", "superadmin", "moderator"]},
                "_id": {"$nin": participants + cancelled_user_ids},
                "emailVerified": True
            }
            
            # If event has a training group, only email members of that group
            if training_group:
                query["trainingGroups"] = training_group
            
            unconfirmed_users = await db.users.find(query).to_list(length=200)
            
            for user in unconfirmed_users:
                try:
                    user_name = user.get("fullName", user.get("username", "Member"))
                    user_email = user.get("email")
                    
                    if not user_email:
                        continue
                    
                    # Generate "call to confirm" email
                    html_content, text_content = get_training_call_to_confirm_template(
                        name=user_name,
                        event_title=event_title_sr,
                        event_title_sv=event_title_sv,
                        event_date=event_date,
                        event_time=event_time,
                        location=event_location
                    )
                    
                    success = await send_email(
                        to_email=user_email,
                        subject=f"Potvrdite učešće: {event_title_sr} - Sutra! / Bekräfta deltagande: {event_title_sv} - Imorgon!",
                        html_content=html_content,
                        text_content=text_content,
                        db=db
                    )
                    
                    if success:
                        total_emails_sent += 1
                        logger.info(f"✓ Call-to-confirm sent to {user_email}")
                    
                except Exception as e:
                    logger.error(f"Error sending call-to-confirm to {user.get('email')}: {str(e)}")
                    continue
        
        logger.info(f"Event reminder job completed. Sent {total_emails_sent} email(s)")
        
    except Exception as e:
        logger.error(f"Error in send_event_reminders job: {str(e)}", exc_info=True)


def start_scheduler(db: AsyncIOMotorDatabase):
    """
    Initialize and start the background scheduler
    
    Schedule:
    - Event reminders: Daily at 9:00 AM (Stockholm time)
    - Log cleanup: Monthly on 1st at 2:00 AM (Stockholm time)
    """
    from activity_logger import cleanup_old_logs
    
    global scheduler
    
    if scheduler is not None:
        logger.warning("Scheduler already running")
        return scheduler
    
    try:
        scheduler = AsyncIOScheduler(timezone="Europe/Stockholm")
        
        # Add event reminder job - runs daily at 9:00 AM
        scheduler.add_job(
            send_event_reminders,
            trigger=CronTrigger(hour=9, minute=0),
            args=[db],
            id='event_reminders',
            name='Send event reminder emails',
            replace_existing=True,
            misfire_grace_time=3600  # Allow 1 hour grace period if server was down
        )
        
        # Add log cleanup job - runs monthly on 1st at 2:00 AM
        scheduler.add_job(
            cleanup_old_logs,
            trigger=CronTrigger(day=1, hour=2, minute=0),
            args=[db, 365],  # 365 days = 1 year retention
            id='log_cleanup',
            name='Cleanup old activity logs',
            replace_existing=True,
            misfire_grace_time=86400  # Allow 24 hour grace period
        )
        
        scheduler.start()
        logger.info("✓ Background scheduler started successfully")
        logger.info("  - Event reminders: Daily at 9:00 AM (Stockholm time)")
        logger.info("  - Log cleanup: Monthly on 1st at 2:00 AM (1 year retention)")
        
        return scheduler
        
    except Exception as e:
        logger.error(f"Failed to start scheduler: {str(e)}", exc_info=True)
        return None


def stop_scheduler():
    """Stop the background scheduler"""
    global scheduler
    
    if scheduler is not None:
        scheduler.shutdown()
        scheduler = None
        logger.info("Background scheduler stopped")
