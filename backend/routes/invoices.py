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
    # Support both old userId and new userIds field
    cursor = db.invoices.find({
        "$or": [
            {"userId": current_user["_id"]},
            {"userIds": current_user["_id"]}
        ]
    }).sort("createdAt", -1)
    invoices_list = await cursor.to_list(length=100)
    
    # Remove MongoDB _id from nested objects
    result = []
    for item in invoices_list:
        invoice = {**item, "id": str(item["_id"])}
        invoice.pop("_id", None)
        result.append(invoice)
    
    return {"invoices": result}

@router.get("/")
async def get_all_invoices(admin: dict = Depends(get_admin_user), request: Request = None):
    """Get all invoices (Admin only)"""
    db = request.app.state.db
    cursor = db.invoices.find().sort("createdAt", -1)
    invoices_list = await cursor.to_list(length=1000)
    
    # Remove MongoDB _id from nested objects
    result = []
    for item in invoices_list:
        invoice = {**item, "id": str(item["_id"])}
        invoice.pop("_id", None)
        result.append(invoice)
    
    return {"invoices": result}

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
    
    return {"success": True, "message": "Invoice deleted"}


@router.post("/{invoice_id}/upload")
async def upload_invoice_file(
    invoice_id: str,
    file: UploadFile = File(...),
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Upload invoice file (PDF, Word, etc.) - Admin only"""
    import logging
    import os
    logger = logging.getLogger(__name__)
    
    db = request.app.state.db
    
    # Check if invoice exists
    invoice = await db.invoices.find_one({"_id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Validate file type
    allowed_extensions = ['.pdf', '.doc', '.docx', '.xlsx', '.xls', '.jpg', '.jpeg', '.png']
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type {file_ext} not allowed. Allowed: {', '.join(allowed_extensions)}")
    
    # Create uploads directory if it doesn't exist
    upload_dir = Path("/app/uploads/invoices")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"invoice_{invoice_id}_{timestamp}{file_ext}"
    file_path = upload_dir / safe_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
    
    # Update invoice with file URL
    file_url = f"/api/invoices/{invoice_id}/download"
    await db.invoices.update_one(
        {"_id": invoice_id},
        {"$set": {"fileUrl": file_url, "fileName": safe_filename}}
    )
    
    # Send email notification to user(s)
    try:
        from email_service import send_email, get_invoice_upload_notification
        
        # Get backend URL for download link
        backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
        frontend_url = backend_url.replace('/api', '')
        download_link = f"{frontend_url}/dashboard"  # User goes to dashboard to see invoices
        
        # Handle both old userId and new userIds
        user_ids = invoice.get("userIds", [])
        if not user_ids and invoice.get("userId"):
            user_ids = [invoice["userId"]]
        
        for user_id in user_ids:
            user = await db.users.find_one({"_id": user_id})
            if user and user.get("email"):
                html_content, text_content = get_invoice_upload_notification(
                    user_name=user.get("fullName", user.get("email")),
                    invoice_description=invoice["description"],
                    amount=invoice["amount"],
                    currency=invoice["currency"],
                    due_date=invoice["dueDate"],
                    download_link=download_link
                )
                
                await send_email(
                    user["email"],
                    "Nova Faktura / Ny Faktura - SKUD Täby",
                    html_content,
                    text_content,
                    db=request.app.state.db
                )
                logger.info(f"Invoice notification email sent to {user['email']}")
    except Exception as e:
        logger.error(f"Failed to send invoice notification email: {str(e)}")
        # Don't fail the upload if email fails
    
    return {
        "success": True,
        "message": "Invoice file uploaded successfully and user notified",
        "fileUrl": file_url,
        "fileName": file.filename
    }

@router.get("/{invoice_id}/download")
async def download_invoice_file(
    invoice_id: str,
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """Download invoice file"""
    from fastapi.responses import FileResponse
    db = request.app.state.db
    
    # Get invoice
    invoice = await db.invoices.find_one({"_id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Check if file exists
    if not invoice.get("fileUrl") or not invoice.get("fileName"):
        raise HTTPException(status_code=404, detail="Invoice file not found")
    
    # Check if user has access (own invoice or admin)
    is_admin = current_user.get("role") in ["admin", "superadmin"]
    is_owner = invoice["userId"] == current_user["_id"]
    
    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get file path
    file_path = Path("/app/uploads/invoices") / invoice["fileName"]
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Invoice file not found on server")
    
    # Return file
    return FileResponse(
        path=str(file_path),
        filename=invoice["fileName"],
        media_type="application/octet-stream"
    )

@router.delete("/{invoice_id}/file")
async def delete_invoice_file(
    invoice_id: str,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Delete uploaded invoice file - Admin only"""
    db = request.app.state.db
    
    # Get invoice
    invoice = await db.invoices.find_one({"_id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if not invoice.get("fileName"):
        raise HTTPException(status_code=404, detail="No file to delete")
    
    # Delete file from filesystem
    file_path = Path("/app/uploads/invoices") / invoice["fileName"]
    if file_path.exists():
        file_path.unlink()
    
    # Update invoice
    await db.invoices.update_one(
        {"_id": invoice_id},
        {"$unset": {"fileUrl": "", "fileName": ""}}
    )
    
    return {"success": True, "message": "Invoice file deleted successfully"}

    return {"success": True, "message": "Invoice deleted successfully"}