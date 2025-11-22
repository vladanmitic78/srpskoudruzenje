from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime

from dependencies import get_admin_user, get_superadmin_user

router = APIRouter()

@router.get("/users")
async def get_all_users(admin: dict = Depends(get_admin_user), request: Request = None):
    """Get all users (Admin only)"""
    db = request.app.state.db
    cursor = db.users.find().sort("createdAt", -1)
    users_list = await cursor.to_list(length=1000)
    
    # Remove sensitive data
    for user in users_list:
        user.pop("hashed_password", None)
        user.pop("verificationToken", None)
        user["id"] = str(user.pop("_id"))
    
    return {"users": users_list}

@router.get("/statistics")
async def get_statistics(admin: dict = Depends(get_admin_user), request: Request = None):
    """Get statistics (Admin only)"""
    db = request.app.state.db
    
    # Count users with role "user"
    total_members = await db.users.count_documents({"role": "user"})
    
    # Count invoices
    paid_invoices = await db.invoices.count_documents({"status": "paid"})
    unpaid_invoices = await db.invoices.count_documents({"status": "unpaid"})
    
    # Calculate revenue
    paid_invoices_list = await db.invoices.find({"status": "paid"}).to_list(length=10000)
    total_revenue = sum(inv.get("amount", 0) for inv in paid_invoices_list)
    
    # Count overdue invoices (7+ days past due date)
    now = datetime.utcnow()
    all_unpaid = await db.invoices.find({"status": "unpaid"}).to_list(length=10000)
    overdue_count = 0
    
    for inv in all_unpaid:
        try:
            due_date = datetime.fromisoformat(inv.get("dueDate", ""))
            if (now - due_date).days > 7:
                overdue_count += 1
        except:
            pass
    
    return {
        "totalMembers": total_members,
        "paidInvoices": paid_invoices,
        "unpaidInvoices": unpaid_invoices,
        "totalRevenue": total_revenue,
        "overdueInvoices": overdue_count
    }

@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    superadmin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """Suspend user account (Super Admin only)"""
    db = request.app.state.db
    
    result = await db.users.update_one(
        {"_id": user_id},
        {"$set": {"suspended": True, "suspendedAt": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "User suspended successfully"}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    superadmin: dict = Depends(get_superadmin_user),
    request: Request = None
):
    """Delete user account (Super Admin only)"""
    db = request.app.state.db
    
    # Don't allow deleting superadmin
    user = await db.users.find_one({"_id": user_id})
    if user and user.get("role") == "superadmin":
        raise HTTPException(status_code=403, detail="Cannot delete super admin")
    
    result = await db.users.delete_one({"_id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"success": True, "message": "User deleted successfully"}