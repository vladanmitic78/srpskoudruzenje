# Serbian Cultural Association (SKUD Täby) - PRD

## Original Problem Statement
Build and maintain a comprehensive membership management platform for the Serbian Cultural Association in Täby, Sweden. The platform includes member registration, invoice management, event management, content management (news, gallery, Serbian stories), and an admin panel with role-based access control.

## Current Application Architecture
- **Frontend:** React with TailwindCSS, Shadcn UI components
- **Backend:** FastAPI (Python) with GZip compression
- **Database:** MongoDB with optimized indexes
- **Email:** SMTP via Loopia (dynamic settings from database)
- **Caching:** In-memory cache for frequently accessed data
- **Performance:** Code splitting, lazy loading, virtual lists

## What's Been Implemented

### February 2026

#### PDF Invoice Auto-Generation (COMPLETED - Feb 2, 2026)
- **Feature**: Automatic PDF invoice generation when admin creates an invoice
- **Serbian Character Support**: Uses DejaVu Sans fonts for š, ž, đ, č, ć
- **Bank Details Management**: Super Admins can configure bank details via Platform Settings
- **Email Notifications**: Automatic email sent to user when invoice is created (bilingual: Serbian/Swedish)
- **Files**:
  - `/app/backend/utils/invoice_generator.py` - PDF template with reportlab
  - `/app/backend/routes/invoices.py` - Invoice creation, file serving, email notification
  - `/app/backend/routes/admin.py` - Bank details API endpoints
  - `/app/backend/email_service.py` - Email templates including `get_invoice_upload_notification`
- **API Endpoints**:
  - `POST /api/invoices/` - Creates invoice, generates PDF, sends email notification
  - `GET /api/invoices/files/{filename}` - Serves PDF files
  - `GET /api/admin/bank-details` - Returns bank details
  - `PUT /api/admin/bank-details` - Updates bank details (Super Admin only)

#### Multi-Member Invoice Creation (COMPLETED - Feb 3, 2026)
- **Feature**: Create invoices for multiple members at once
- **UI**: Checkbox-based member selection with search
- **Quick Select**: "Select All" and "Select Without Unpaid" buttons
- **Files**:
  - `/app/frontend/src/components/admin/CreateInvoiceDialog.jsx` - Reusable component
  - `/app/frontend/src/pages/AdminDashboard.js` - Updated dialog

#### Advanced Member Filtering (COMPLETED - Feb 3, 2026)
- **Filters**: Invoice status (Paid/Unpaid/None), Family status (Has Family/Individual)
- **CSV Download**: Download filtered member list with all relevant data
- **Files**:
  - `/app/frontend/src/components/admin/MemberFilters.jsx` - Reusable component
  - `/app/frontend/src/pages/AdminDashboard.js` - Integrated filters

#### AdminDashboard Refactoring (IN PROGRESS)
- **Created**: `/app/frontend/src/components/admin/` folder structure
- **Extracted Components**:
  - `CreateInvoiceDialog.jsx` - Invoice creation modal
  - `MemberFilters.jsx` - Member filtering with CSV export
  - `index.js` - Central export point
- **Remaining**: Extract more components (InvoiceTable, EventManagement, etc.)

### December 2025 - January 2026

#### Family/Group Membership System (COMPLETED)
- Adults (18+) can add family members (children, spouse, friends)
- Each family member gets their own login credentials
- Automatic email with temporary password sent to new members
- Family members visible under parent's account
- **Admin can add family members to any user via Admin Dashboard → Family tab**
- Full CRUD operations for family management
- Backend: `/app/backend/routes/family.py`
- Frontend User: `/app/frontend/src/components/FamilyMembersSection.jsx`
- Frontend Admin: `/app/frontend/src/components/AdminFamilyManagement.jsx`

#### Admin Settings Visibility (VERIFIED WORKING)
- Checkboxes in Admin/Settings control field visibility on public pages
- Visibility settings stored in `platform_settings` collection
- Footer respects visibility flags for all fields

#### Media Optimization System
- Automatic image compression on upload (Pillow library)
- Optimized all existing images via script
- Documentation: `/app/MEDIA_OPTIMIZATION.md`

#### UI/UX Improvements
- Serbian Story: 3x2 grid with pagination, video link support
- Gallery: 3x3 grid with pagination
- Home: "Read More" modal for news, clickable flag language switcher
- Footer: Dynamic visibility based on admin settings

#### Bug Fixes
- Email system regression fixed (From header format)
- Required field removed from Snapchat URL

## Key Files Reference
- `/app/backend/routes/family.py` - Family membership API
- `/app/backend/routes/admin.py` - Admin endpoints
- `/app/backend/routes/settings.py` - Settings API
- `/app/backend/models.py` - Data models
- `/app/frontend/src/components/FamilyMembersSection.jsx` - Family UI
- `/app/frontend/src/pages/AdminDashboard.js` - Admin panel (needs refactoring)
- `/app/frontend/src/components/Footer.js` - Public footer with visibility

## Database Schema
- `users`: Includes `primaryAccountId`, `dependentMembers[]`, `relationship`
- `invoices`: Uses `userIds[]` for multi-member support
- `platform_settings`: Includes `visibility` object

## Test Credentials
- Super Admin: `vladanmitic@gmail.com` / `Admin123!`
- Moderator: `mitawaybackup@gmail.com` / `moderator123`

## Prioritized Backlog

### P0 - Critical
- None currently

### P1 - High Priority
- Frontend UI for Multi-Member Invoices (select multiple users)
- Member filtering UI (by invoice status, training group)
- Download filtered member list button
- Refactor `AdminDashboard.js` (4000+ lines → smaller components)

### P2 - Medium Priority
- Fix incorrect admin dashboard statistics
- User impersonation for Super Admins

### P3 - Future Enhancements
- Enhanced reporting and analytics
- Bulk operations for member management

## Recent Updates (Feb 2, 2026)

### PDF Invoice Auto-Generation (COMPLETED)
- **Feature**: Automatic PDF invoice generation when admin creates an invoice
- **Bank Details Management**: Super Admins can configure bank details (Bank Name, Account Holder, IBAN, BIC/SWIFT, Bankgiro, Org Number, Swish) via Platform Settings → Bank Details section
- **PDF Contents**: Professional template with Serbian cultural branding, member info, amount, due date, payment status, and bank details
- **File Access**: View and Download buttons on invoices table
- **Backend Files**:
  - `/app/backend/utils/invoice_generator.py` - PDF generation using reportlab
  - `/app/backend/routes/invoices.py` - Lines 39-103 (create), Lines 303-334 (file serving)
  - `/app/backend/routes/admin.py` - Bank details endpoints (GET/PUT /api/admin/bank-details)
- **Frontend Files**:
  - `/app/frontend/src/pages/AdminDashboard.js` - Bank Details UI in Platform Settings tab
- **Database**: Bank details stored in MongoDB `settings` collection with `_id='bank_details'`
- **PDF Storage**: `/app/uploads/invoices/` directory
- **API Endpoints**:
  - `POST /api/invoices/` - Creates invoice with auto-generated PDF
  - `GET /api/invoices/files/{filename}` - Serves PDF files
  - `GET /api/admin/bank-details` - Returns bank details
  - `PUT /api/admin/bank-details` - Updates bank details (Super Admin only)
- **Testing**: All 14 backend tests passed, frontend verified working
- **Test Files**: `/app/backend/tests/test_invoice_pdf.py`
