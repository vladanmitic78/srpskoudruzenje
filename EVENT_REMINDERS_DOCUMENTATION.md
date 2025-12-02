# Automatic Event Reminder System

## Overview
The application now includes an **automated email reminder system** that sends reminder emails to all registered participants **1 day before** each training/event.

## How It Works

### Schedule
- **Trigger Time**: Every day at 9:00 AM (Stockholm time)
- **Checks**: Events scheduled for tomorrow
- **Recipients**: All users who have confirmed participation for those events

### Email Content
The reminder email includes:
- **Bilingual**: Serbian and Swedish
- **Event Details**:
  - Event title
  - Date
  - Time
  - Location
- **Subject**: "Podsetnik: {event_title} - Sutra! / Påminnelse: {event_title} - Imorgon!"

### Technical Implementation

#### Components
1. **Scheduler** (`/app/backend/scheduler.py`)
   - Uses APScheduler (AsyncIO version)
   - Runs daily at 9:00 AM Stockholm time
   - Timezone-aware scheduling

2. **Job Function** (`send_event_reminders`)
   - Queries events happening tomorrow
   - Filters active events only (status = 'active')
   - Fetches participant details from database
   - Sends personalized emails to each participant

3. **Integration** (`/app/backend/server.py`)
   - Scheduler starts on application startup
   - Gracefully stops on application shutdown
   - Integrated with FastAPI lifecycle events

#### Database Queries
```python
# Find events tomorrow
events = db.events.find({
    "date": tomorrow_str,
    "status": "active"
})

# Get participant details
user = db.users.find_one(
    {"id": participant_id},
    {"_id": 0, "name": 1, "email": 1}
)
```

## Testing

### Manual Test Endpoint
For testing purposes, Super Admins can manually trigger the reminder job:

**Endpoint**: `POST /api/admin/test-event-reminders`
**Authorization**: Super Admin only
**Response**:
```json
{
  "success": true,
  "message": "Event reminder job executed. Check server logs for details."
}
```

### Testing Steps
1. Create an event with tomorrow's date
2. Have users register for the event
3. Either:
   - Wait until 9:00 AM tomorrow, OR
   - Use the test endpoint to trigger immediately
4. Check server logs for confirmation
5. Verify emails received by participants

### Log Messages
The scheduler logs detailed information:
```
INFO - Starting daily event reminder check...
INFO - Checking for events on 2025-12-03
INFO - Found 2 event(s) for tomorrow
INFO - Processing event 'Training Session' with 5 participant(s)
INFO - ✓ Reminder sent to user@example.com for event 'Training Session'
INFO - Event reminder job completed. Sent 5 reminder email(s)
```

## Configuration

### Schedule Settings
Located in `/app/backend/scheduler.py`:
```python
# Change reminder time (currently 9:00 AM)
scheduler.add_job(
    send_event_reminders,
    trigger=CronTrigger(hour=9, minute=0),  # Modify hour/minute here
    ...
)
```

### Timezone
Current timezone: `Europe/Stockholm`
To change, modify in `scheduler.py`:
```python
scheduler = AsyncIOScheduler(timezone="Europe/Stockholm")
```

## Requirements

### Python Packages
- `apscheduler==3.11.1` - Background task scheduler
- `tzlocal>=3.0` - Timezone handling (installed automatically with apscheduler)

### Email Service
- Uses existing SMTP configuration from `email_service.py`
- Server: mailcluster.loopia.se
- Port: 465 (SSL/TLS)

## Error Handling

### Graceful Failure
- If a reminder fails for one user, the job continues with other users
- Each failure is logged individually
- Errors don't interrupt the entire reminder process

### Misfire Grace Period
- 1 hour grace period if server was down during scheduled time
- Job will run once when server restarts if missed

### Logging
All errors are logged with full stack traces:
```python
logger.error(f"Error sending reminder to participant {participant_id}: {str(e)}")
```

## Monitoring

### Check Scheduler Status
View backend logs:
```bash
tail -f /var/log/supervisor/backend.err.log
```

Look for:
```
✓ Background scheduler started successfully
- Event reminders: Daily at 9:00 AM (Stockholm time)
```

### View Reminder Execution
Logs show:
- Number of events found
- Number of emails sent
- Success/failure for each email
- Total emails sent

## Future Enhancements

Potential improvements:
1. **Configurable Timing**: Allow admins to set reminder time via UI
2. **Multiple Reminders**: Send reminders at 1 week, 3 days, and 1 day before
3. **SMS Reminders**: Add SMS notification option
4. **User Preferences**: Let users choose reminder preferences
5. **Email Templates**: Admin-customizable email templates
6. **Reminder Statistics**: Track delivery rates and open rates

## Troubleshooting

### Reminders Not Sending

1. **Check Scheduler Status**:
   ```bash
   grep "scheduler" /var/log/supervisor/backend.err.log
   ```

2. **Verify Event Date Format**:
   - Events must have date in ISO format: `YYYY-MM-DD`
   - Event status must be 'active'

3. **Check Participant List**:
   - Ensure event has `participants` array with user IDs
   - Verify users exist in database
   - Confirm users have valid email addresses

4. **Test Email Service**:
   - Use the test endpoint to trigger manually
   - Check SMTP configuration is correct
   - Verify no firewall blocking port 465

### Debugging
Enable detailed logging in `scheduler.py`:
```python
logger.setLevel(logging.DEBUG)
```

## Support

For issues or questions:
1. Check server logs for error messages
2. Verify database has correct event and user data
3. Test email service independently
4. Use the manual test endpoint to diagnose issues

---

**Created**: December 2, 2025
**Version**: 1.0
**Last Updated**: December 2, 2025
