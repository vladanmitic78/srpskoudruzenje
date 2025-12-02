"""
Activity logging system for admin actions
Logs essential admin activities with 1-year retention
"""
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger(__name__)


async def log_admin_activity(
    db: AsyncIOMotorDatabase,
    admin_id: str,
    admin_name: str,
    action: str,
    target_type: str,
    target_id: str = None,
    details: dict = None,
    ip_address: str = None
):
    """
    Log admin activity to database
    
    Args:
        db: Database connection
        admin_id: ID of admin performing action
        admin_name: Name of admin
        action: Action performed (create, edit, delete, etc.)
        target_type: Type of target (user, invoice, event, news, etc.)
        target_id: ID of target entity
        details: Additional details about the action
        ip_address: IP address of request
    """
    try:
        log_entry = {
            "adminId": admin_id,
            "adminName": admin_name,
            "action": action,
            "targetType": target_type,
            "targetId": target_id,
            "details": details or {},
            "ipAddress": ip_address,
            "timestamp": datetime.now(timezone.utc)
        }
        
        await db.admin_activity_logs.insert_one(log_entry)
        logger.info(f"Activity logged: {admin_name} {action} {target_type} {target_id}")
        
    except Exception as e:
        logger.error(f"Failed to log activity: {str(e)}")


async def cleanup_old_logs(db: AsyncIOMotorDatabase, retention_days: int = 365):
    """
    Remove activity logs older than retention period (default 1 year)
    Should be run periodically via scheduler
    """
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
        
        result = await db.admin_activity_logs.delete_many({
            "timestamp": {"$lt": cutoff_date}
        })
        
        logger.info(f"Cleaned up {result.deleted_count} old activity logs (older than {retention_days} days)")
        return result.deleted_count
        
    except Exception as e:
        logger.error(f"Failed to cleanup old logs: {str(e)}")
        return 0


async def get_activity_logs(
    db: AsyncIOMotorDatabase,
    admin_id: str = None,
    target_type: str = None,
    action: str = None,
    start_date: datetime = None,
    end_date: datetime = None,
    limit: int = 100,
    skip: int = 0
):
    """
    Retrieve activity logs with filters
    
    Args:
        db: Database connection
        admin_id: Filter by admin ID
        target_type: Filter by target type
        action: Filter by action
        start_date: Filter by start date
        end_date: Filter by end date
        limit: Number of results to return
        skip: Number of results to skip
        
    Returns:
        List of activity log entries
    """
    try:
        query = {}
        
        if admin_id:
            query["adminId"] = admin_id
        
        if target_type:
            query["targetType"] = target_type
        
        if action:
            query["action"] = action
        
        if start_date or end_date:
            query["timestamp"] = {}
            if start_date:
                query["timestamp"]["$gte"] = start_date
            if end_date:
                query["timestamp"]["$lte"] = end_date
        
        cursor = db.admin_activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit)
        logs = await cursor.to_list(length=limit)
        
        # Get total count for pagination
        total = await db.admin_activity_logs.count_documents(query)
        
        return {
            "logs": logs,
            "total": total,
            "limit": limit,
            "skip": skip
        }
        
    except Exception as e:
        logger.error(f"Failed to retrieve activity logs: {str(e)}")
        return {"logs": [], "total": 0, "limit": limit, "skip": skip}
