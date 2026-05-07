"""
Background scheduler for automated tasks
- Send event reminder emails 1 day before the event (once per event)
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
    Send reminder emails for events happening tomorrow.
    Runs daily at 9 AM but only sends ONCE per event (tracked by reminderSent flag).
    
    Logic:
    1. Confirmed participants get a reminder email
    2. For kids-only groups (folklore): only PARENTS of unconfirmed children get a call-to-confirm
    3. For adult groups: unconfirmed adults in the group get a call-to-confirm
    4. Adults WITHOUT registered children do NOT get folklore notifications
    """
    try:
        logger.info("Starting daily event reminder check...")
        
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).date()
        tomorrow_str = tomorrow.isoformat()
        
        logger.info(f"Checking for events on {tomorrow_str}")
        
        # Only find events that haven't been reminded yet
        events = await db.events.find({
            "date": tomorrow_str,
            "status": "active",
            "reminderSent": {"$ne": True}
        }).to_list(length=100)
        
        if not events:
            logger.info(f"No events needing reminders for {tomorrow_str}")
            return
        
        logger.info(f"Found {len(events)} event(s) needing reminders")
        
        total_emails_sent = 0
        for event in events:
            event_id = event.get("_id")
            event_title_sr = event.get("title", {}).get("sr-latin", "Trening")
            event_title_sv = event.get("title", {}).get("sv", event_title_sr)
            event_date = event.get("date")
            event_time = event.get("time", "TBD")
            event_location = event.get("location", "TBD")
            participants = event.get("participants", [])
            cancellations = event.get("cancellations", [])
            cancelled_user_ids = [c.get("userId") for c in cancellations]
            training_group = event.get("trainingGroup")
            
            # Track emails sent to avoid duplicates within this event
            emails_sent_to = set()
            
            # ===== PART 1: Reminder to confirmed participants =====
            for participant_id in participants:
                try:
                    user = await db.users.find_one({"_id": participant_id})
                    if not user:
                        continue
                    
                    user_name = user.get("fullName", user.get("username", "Member"))
                    user_email = user.get("email")
                    
                    # If child without email, send to parent
                    if not user_email:
                        parent_id = user.get("primaryAccountId")
                        if parent_id:
                            parent = await db.users.find_one({"_id": parent_id})
                            if parent:
                                user_email = parent.get("email")
                                user_name = f"{user_name} ({parent.get('fullName', 'roditelj')})"
                    
                    if not user_email or user_email in emails_sent_to:
                        continue
                    
                    html_content, text_content = get_training_reminder_template(
                        name=user_name,
                        event_title=event_title_sr,
                        event_title_sv=event_title_sv,
                        event_date=event_date,
                        event_time=event_time,
                        location=event_location
                    )
                    
                    success = await send_email(
                        to_email=user_email,
                        subject=f"Podsetnik: {event_title_sr} - Sutra! / Påminnelse: {event_title_sv} - Imorgon!",
                        html_content=html_content,
                        text_content=text_content,
                        db=db
                    )
                    
                    if success:
                        total_emails_sent += 1
                        emails_sent_to.add(user_email)
                        logger.info(f"✓ Reminder sent to {user_email}")
                        
                except Exception as e:
                    logger.error(f"Error sending reminder to {participant_id}: {str(e)}")
                    continue
            
            # ===== PART 2: Call to confirm for unconfirmed members =====
            if not training_group:
                logger.info(f"Event '{event_title_sr}' has no training group, skipping call-to-confirm")
            else:
                # Find CHILDREN in this training group who haven't confirmed/declined
                # Send email to their PARENTS (not to random adults)
                children_in_group = await db.users.find({
                    "trainingGroups": training_group,
                    "primaryAccountId": {"$exists": True, "$ne": None},
                    "_id": {"$nin": participants + cancelled_user_ids}
                }).to_list(length=200)
                
                for child in children_in_group:
                    try:
                        parent_id = child.get("primaryAccountId")
                        if not parent_id:
                            continue
                        
                        parent = await db.users.find_one({"_id": parent_id})
                        if not parent:
                            continue
                        
                        parent_email = parent.get("email")
                        if not parent_email or parent_email in emails_sent_to:
                            continue
                        
                        child_name = child.get("fullName", "your child")
                        parent_name = parent.get("fullName", parent.get("username", "Member"))
                        
                        html_content, text_content = get_training_call_to_confirm_template(
                            name=parent_name,
                            event_title=event_title_sr,
                            event_title_sv=event_title_sv,
                            event_date=event_date,
                            event_time=event_time,
                            location=event_location
                        )
                        
                        success = await send_email(
                            to_email=parent_email,
                            subject=f"Potvrdite za {child_name}: {event_title_sr} - Sutra! / Bekräfta för {child_name}: {event_title_sv} - Imorgon!",
                            html_content=html_content,
                            text_content=text_content,
                            db=db
                        )
                        
                        if success:
                            total_emails_sent += 1
                            emails_sent_to.add(parent_email)
                            logger.info(f"✓ Call-to-confirm sent to {parent_email} for child {child_name}")
                        
                    except Exception as e:
                        logger.error(f"Error sending call-to-confirm for child: {str(e)}")
                        continue
                
                # Find ADULTS directly in this training group who haven't confirmed
                # (only adults who are themselves members of the group, e.g. adult dance class)
                adults_in_group = await db.users.find({
                    "trainingGroups": training_group,
                    "primaryAccountId": {"$exists": False},
                    "_id": {"$nin": participants + cancelled_user_ids},
                    "emailVerified": True,
                    "email": {"$exists": True, "$ne": None}
                }).to_list(length=200)
                
                for adult in adults_in_group:
                    try:
                        adult_email = adult.get("email")
                        if not adult_email or adult_email in emails_sent_to:
                            continue
                        
                        adult_name = adult.get("fullName", adult.get("username", "Member"))
                        
                        html_content, text_content = get_training_call_to_confirm_template(
                            name=adult_name,
                            event_title=event_title_sr,
                            event_title_sv=event_title_sv,
                            event_date=event_date,
                            event_time=event_time,
                            location=event_location
                        )
                        
                        success = await send_email(
                            to_email=adult_email,
                            subject=f"Potvrdite: {event_title_sr} - Sutra! / Bekräfta: {event_title_sv} - Imorgon!",
                            html_content=html_content,
                            text_content=text_content,
                            db=db
                        )
                        
                        if success:
                            total_emails_sent += 1
                            emails_sent_to.add(adult_email)
                            logger.info(f"✓ Call-to-confirm sent to {adult_email}")
                        
                    except Exception as e:
                        logger.error(f"Error sending call-to-confirm to adult: {str(e)}")
                        continue
            
            # Mark event as reminded - will NOT send again
            await db.events.update_one(
                {"_id": event_id},
                {"$set": {"reminderSent": True, "reminderSentAt": datetime.now(timezone.utc)}}
            )
            logger.info(f"✓ Event '{event_title_sr}' marked as reminded")
        
        logger.info(f"Reminder job done. Sent {total_emails_sent} email(s)")
        
    except Exception as e:
        logger.error(f"Error in send_event_reminders: {str(e)}", exc_info=True)


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
