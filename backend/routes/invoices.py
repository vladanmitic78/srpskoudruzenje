from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from datetime import datetime
import shutil
from pathlib import Path

from models import InvoiceCreate, InvoiceResponse, InvoiceMarkPaid
from dependencies import get_admin_user, get_current_user

router = APIRouter()

@router.get("/my")
async def get_my_invoices(current_user: dict = Depends(get_current_user), request: Request = None):
    """Get current user's invoices"""
    db = request.app.state.db
    cursor = db.invoices.find({"userId": current_user["_id"]}).sort("createdAt", -1)
    invoices_list = await cursor.to_list(length=100)
    
    return {
        "invoices": [{**item, "id": str(item["_id"])} for item in invoices_list]
    }

@router.get("/")
async def get_all_invoices(admin: dict = Depends(get_admin_user), request: Request = None):
    """Get all invoices (Admin only)"""
    db = request.app.state.db
    cursor = db.invoices.find().sort("createdAt", -1)
    invoices_list = await cursor.to_list(length=1000)
    
    return {
        "invoices": [{**item, "id": str(item["_id"])} for item in invoices_list]
    }

@router.post("/", response_model=InvoiceResponse)
async def create_invoice(
    invoice: InvoiceCreate,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Create invoice for a user (Admin only)"""
    db = request.app.state.db
    invoice_dict = invoice.dict()
    invoice_dict["_id"] = f"invoice_{int(datetime.utcnow().timestamp() * 1000)}"
    invoice_dict["status"] = "unpaid"
    invoice_dict["paymentDate"] = None
    invoice_dict["createdAt"] = datetime.utcnow()
    
    await db.invoices.insert_one(invoice_dict)
    
    return InvoiceResponse(**{**invoice_dict, "id": invoice_dict["_id"]})

@router.put("/{invoice_id}/mark-paid")
async def mark_invoice_paid(
    invoice_id: str,
    payment_data: InvoiceMarkPaid,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Mark invoice as paid (Admin only)"""
    db = request.app.state.db
    result = await db.invoices.update_one(
        {"_id": invoice_id},
        {"$set": {"status": "paid", "paymentDate": payment_data.paymentDate}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"success": True, "message": "Invoice marked as paid"}

@router.post("/{invoice_id}/upload")
async def upload_invoice_file(
    invoice_id: str,
    file: UploadFile = File(...),
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Upload invoice file (Admin only)"""
    db = request.app.state.db
    upload_dir = request.app.state.upload_dir
    
    # Save file
    file_path = upload_dir / "invoices" / f"{invoice_id}_{file.filename}"
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update invoice with file URL
    file_url = f"/api/files/invoices/{file_path.name}"
    await db.invoices.update_one(
        {"_id": invoice_id},
        {"$set": {"fileUrl": file_url}}
    )
    
    return {"success": True, "fileUrl": file_url}

@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Delete invoice (Admin only)"""
    db = request.app.state.db
    result = await db.invoices.delete_one({"_id": invoice_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"success": True, "message": "Invoice deleted successfully"}