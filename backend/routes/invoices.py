from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from datetime import datetime
import shutil
import os
from pathlib import Path

from models import InvoiceCreate, InvoiceResponse, InvoiceMarkPaid, CreditNoteCreate, CreditNoteResponse
from dependencies import get_admin_user, get_current_user
from utils.invoice_generator import generate_invoice_pdf
from utils.credit_note_generator import generate_credit_note_pdf

router = APIRouter()

# Ensure directories exist
INVOICES_DIR = Path("/app/uploads/invoices")
INVOICES_DIR.mkdir(parents=True, exist_ok=True)
CREDIT_NOTES_DIR = Path("/app/uploads/credit_notes")
CREDIT_NOTES_DIR.mkdir(parents=True, exist_ok=True)

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
    """Create invoice for user(s) (Admin only) - Auto-generates PDF"""
    db = request.app.state.db
    
    # Support both single userId and multiple userIds
    user_ids = invoice.userIds if hasattr(invoice, 'userIds') else [getattr(invoice, 'userId', None)]
    
    if not user_ids or not user_ids[0]:
        raise HTTPException(status_code=400, detail="No user specified")
    
    # For single user invoices (most common case)
    primary_user_id = user_ids[0]
    
    # Get user details for the invoice
    user = await db.users.find_one({"_id": primary_user_id})
    if not user:
        user = await db.users.find_one({"id": primary_user_id})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    invoice_id = f"invoice_{int(datetime.utcnow().timestamp() * 1000)}"
    created_at = datetime.utcnow()
    
    invoice_dict = invoice.dict()
    invoice_dict["_id"] = invoice_id
    invoice_dict["userId"] = primary_user_id  # Store primary userId for backward compatibility
    invoice_dict["status"] = "unpaid"
    invoice_dict["paymentDate"] = None
    invoice_dict["createdAt"] = created_at
    
    # Generate PDF invoice
    try:
        pdf_filename = f"{invoice_id}.pdf"
        pdf_path = INVOICES_DIR / pdf_filename
        
        # Fetch bank details from database
        bank_details_doc = await db.settings.find_one({"_id": "bank_details"})
        bank_details = None
        if bank_details_doc:
            bank_details_doc.pop("_id", None)
            bank_details = bank_details_doc
        
        generate_invoice_pdf(
            invoice_id=invoice_id,
            member_name=user.get("fullName", user.get("username", "Member")),
            member_email=user.get("email", ""),
            description=invoice.description,
            amount=float(invoice.amount),
            currency=invoice.currency or "SEK",
            due_date=invoice.dueDate,
            created_at=created_at.isoformat(),
            output_path=str(pdf_path),
            status="unpaid",
            bank_details=bank_details
        )
        
        # Store the file URL and filename in the invoice
        invoice_dict["fileUrl"] = f"/api/invoices/files/{pdf_filename}"
        invoice_dict["fileName"] = pdf_filename
        invoice_dict["pdfGenerated"] = True
        
    except Exception as e:
        print(f"Failed to generate PDF: {e}")
        invoice_dict["fileUrl"] = None
        invoice_dict["pdfGenerated"] = False
    
    await db.invoices.insert_one(invoice_dict)
    
    # Send email notification to the user
    try:
        from email_service import send_email, get_invoice_upload_notification
        
        user_email = user.get("email")
        user_name = user.get("fullName", user.get("username", "Member"))
        
        if user_email:
            # Generate direct PDF download link
            frontend_url = os.environ.get('FRONTEND_URL', 'https://srpskoudruzenjetaby.se')
            download_link = f"{frontend_url}/api/invoices/files/{pdf_filename}"
            
            html, text = get_invoice_upload_notification(
                user_name=user_name,
                invoice_description=invoice.description,
                amount=float(invoice.amount),
                currency=invoice.currency or "SEK",
                due_date=invoice.dueDate,
                download_link=download_link
            )
            
            await send_email(
                to_email=user_email,
                subject=f"Nova Faktura / Ny Faktura - {invoice.description}",
                html_content=html,
                text_content=text,
                db=db
            )
            print(f"Invoice notification sent to {user_email}")
    except Exception as e:
        # Don't fail the invoice creation if email fails
        print(f"Failed to send invoice notification email: {e}")
    
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

@router.put("/{invoice_id}")
async def update_invoice(
    invoice_id: str,
    invoice_data: dict,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """Update invoice details (Admin only)"""
    db = request.app.state.db
    
    # Check if invoice exists
    existing = await db.invoices.find_one({"_id": invoice_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Don't allow editing paid invoices
    if existing.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Cannot edit a paid invoice")
    
    # Build update data - only allow specific fields
    update_fields = {}
    allowed_fields = ["description", "amount", "currency", "dueDate", "userId"]
    
    for field in allowed_fields:
        if field in invoice_data:
            update_fields[field] = invoice_data[field]
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    update_fields["updatedAt"] = datetime.utcnow()
    
    result = await db.invoices.update_one(
        {"_id": invoice_id},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Return updated invoice
    updated = await db.invoices.find_one({"_id": invoice_id})
    updated["id"] = str(updated["_id"])
    
    return {"success": True, "message": "Invoice updated successfully", "invoice": updated}

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


@router.post("/{invoice_id}/credit", response_model=CreditNoteResponse)
async def credit_invoice(
    invoice_id: str,
    credit_data: CreditNoteCreate,
    admin: dict = Depends(get_admin_user),
    request: Request = None
):
    """
    Create a credit note for an invoice (Admin/SuperAdmin only)
    This cancels/refunds the invoice and creates an archive record
    """
    db = request.app.state.db
    
    # Get the invoice
    invoice = await db.invoices.find_one({"_id": invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Check if already credited
    if invoice.get("status") == "credited":
        raise HTTPException(status_code=400, detail="Invoice has already been credited")
    
    # Get user details
    user_id = invoice.get("userId") or (invoice.get("userIds", [None])[0])
    user = await db.users.find_one({"_id": user_id})
    if not user:
        user = await db.users.find_one({"id": user_id})
    
    member_name = user.get("fullName", "Unknown") if user else "Unknown"
    member_email = user.get("email", "") if user else ""
    
    # Generate credit note number (CN-YYYYMMDD-XXX format)
    today = datetime.utcnow().strftime("%Y%m%d")
    count = await db.credit_notes.count_documents({"creditNoteNumber": {"$regex": f"^CN-{today}"}})
    credit_note_number = f"CN-{today}-{count + 1:03d}"
    
    credit_note_id = f"cn_{int(datetime.utcnow().timestamp() * 1000)}"
    created_at = datetime.utcnow()
    
    # Generate credit note PDF
    pdf_filename = f"{credit_note_id}.pdf"
    pdf_path = CREDIT_NOTES_DIR / pdf_filename
    
    try:
        # Get bank details for reference
        bank_details_doc = await db.settings.find_one({"_id": "bank_details"})
        bank_details = None
        if bank_details_doc:
            bank_details_doc.pop("_id", None)
            bank_details = bank_details_doc
        
        generate_credit_note_pdf(
            credit_note_id=credit_note_id,
            credit_note_number=credit_note_number,
            original_invoice_id=invoice_id,
            member_name=member_name,
            member_email=member_email,
            original_description=invoice.get("description", ""),
            original_amount=float(invoice.get("amount", 0)),
            currency=invoice.get("currency", "SEK"),
            reason=credit_data.reason,
            created_at=created_at.isoformat(),
            created_by=admin.get("fullName", admin.get("username", "Admin")),
            output_path=str(pdf_path),
            bank_details=bank_details
        )
        
        file_url = f"/api/invoices/credit-notes/files/{pdf_filename}"
        pdf_generated = True
    except Exception as e:
        print(f"Failed to generate credit note PDF: {e}")
        file_url = None
        pdf_generated = False
    
    # Create credit note record
    credit_note = {
        "_id": credit_note_id,
        "invoiceId": invoice_id,
        "creditNoteNumber": credit_note_number,
        "originalAmount": float(invoice.get("amount", 0)),
        "currency": invoice.get("currency", "SEK"),
        "reason": credit_data.reason,
        "createdAt": created_at,
        "createdBy": admin.get("fullName", admin.get("username", "Admin")),
        "createdById": admin.get("_id"),
        "memberName": member_name,
        "memberEmail": member_email,
        "userId": user_id,
        "fileUrl": file_url,
        "fileName": pdf_filename if pdf_generated else None,
        "pdfGenerated": pdf_generated
    }
    
    await db.credit_notes.insert_one(credit_note)
    
    # Update invoice status to credited
    await db.invoices.update_one(
        {"_id": invoice_id},
        {"$set": {
            "status": "credited",
            "creditNoteId": credit_note_id,
            "creditNoteNumber": credit_note_number,
            "creditedAt": created_at,
            "creditedBy": admin.get("fullName", admin.get("username", "Admin")),
            "creditReason": credit_data.reason
        }}
    )
    
    # Send email notification to user
    try:
        from email_service import send_email
        
        if member_email:
            # Generate direct PDF download link
            frontend_url = os.environ.get('FRONTEND_URL', 'https://srpskoudruzenjetaby.se')
            cn_download_link = f"{frontend_url}/api/invoices/credit-notes/files/{pdf_filename}" if pdf_generated else f"{frontend_url}/profile"
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
                        <h2 style="margin: 0;">💳 Knjižno Odobrenje / Kreditfaktura</h2>
                    </div>
                    
                    <div style="background: white; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px;">
                        <p><strong>Poštovani/a {member_name},</strong></p>
                        <p>Obaveštavamo Vas da je kreirano knjižno odobrenje (credit note) za Vašu fakturu.</p>
                        
                        <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                            <p style="margin: 5px 0;"><strong>Broj odobrenja / Credit Note #:</strong> {credit_note_number}</p>
                            <p style="margin: 5px 0;"><strong>Originalna faktura / Original Invoice:</strong> {invoice_id[-8:].upper()}</p>
                            <p style="margin: 5px 0;"><strong>Iznos / Amount:</strong> <span style="color: #28a745; font-size: 18px; font-weight: bold;">-{invoice.get('amount', 0):.2f} {invoice.get('currency', 'SEK')}</span></p>
                            <p style="margin: 5px 0;"><strong>Razlog / Reason:</strong> {credit_data.reason}</p>
                        </div>
                        
                        <center>
                            <a href="{cn_download_link}" style="display: inline-block; padding: 12px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">📥 Preuzmite Dokument / Download Document</a>
                        </center>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        
                        <p><strong>Hej {member_name},</strong></p>
                        <p>Vi informeras om att en kreditfaktura har skapats för din faktura.</p>
                        
                        <center>
                            <a href="{cn_download_link}" style="display: inline-block; padding: 12px 30px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">📥 Ladda Ner Dokument</a>
                        </center>
                        
                        <p style="color: #666; font-size: 12px; margin-top: 30px; text-align: center;">
                            Srpsko Kulturno Udruženje Täby<br>
                            info@srpskoudruzenjetaby.se
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            await send_email(
                to_email=member_email,
                subject=f"Knjižno Odobrenje / Kreditfaktura - {credit_note_number}",
                html_content=html_content,
                db=db
            )
    except Exception as e:
        print(f"Failed to send credit note notification email: {e}")
    
    return CreditNoteResponse(
        id=credit_note_id,
        invoiceId=invoice_id,
        creditNoteNumber=credit_note_number,
        originalAmount=float(invoice.get("amount", 0)),
        currency=invoice.get("currency", "SEK"),
        reason=credit_data.reason,
        createdAt=created_at,
        createdBy=admin.get("fullName", admin.get("username", "Admin")),
        memberName=member_name,
        memberEmail=member_email,
        fileUrl=file_url,
        fileName=pdf_filename if pdf_generated else None
    )


@router.get("/credit-notes/files/{filename}")
async def get_credit_note_file(filename: str, request: Request):
    """Serve credit note PDF files"""
    from fastapi.responses import FileResponse
    
    file_path = CREDIT_NOTES_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Credit note file not found")
    
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=filename
    )


@router.get("/credit-notes/my")
async def get_my_credit_notes(current_user: dict = Depends(get_current_user), request: Request = None):
    """Get current user's credit notes"""
    db = request.app.state.db
    cursor = db.credit_notes.find({"userId": current_user["_id"]}).sort("createdAt", -1)
    credit_notes_list = await cursor.to_list(length=100)
    
    return {
        "creditNotes": [{**item, "id": str(item["_id"])} for item in credit_notes_list]
    }


@router.get("/credit-notes/")
async def get_all_credit_notes(admin: dict = Depends(get_admin_user), request: Request = None):
    """Get all credit notes (Admin only)"""
    db = request.app.state.db
    cursor = db.credit_notes.find().sort("createdAt", -1)
    credit_notes_list = await cursor.to_list(length=1000)
    
    return {
        "creditNotes": [{**item, "id": str(item["_id"])} for item in credit_notes_list]
    }


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
    
    # Send email notification to user
    try:
        # Get user details
        user = await db.users.find_one({"_id": invoice["userId"]})
        if user and user.get("email"):
            from email_service import send_email, get_invoice_upload_notification
            
            # Get backend URL for download link
            backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
            frontend_url = backend_url.replace('/api', '')
            download_link = f"{frontend_url}/dashboard"  # User goes to dashboard to see invoices
            
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
                text_content
            , db=request.app.state.db)
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

@router.get("/files/{filename}")
async def serve_invoice_file(
    filename: str,
    request: Request = None
):
    """Serve invoice PDF files (auto-generated or uploaded) - public access with filename"""
    from fastapi.responses import FileResponse
    
    # Get file path
    file_path = Path("/app/uploads/invoices") / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Invoice file not found")
    
    # Return file as PDF
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f"inline; filename={filename}"}
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