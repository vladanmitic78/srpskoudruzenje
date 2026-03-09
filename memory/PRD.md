# Serbian Cultural Association (SKUD Täby) - PRD

## Original Problem Statement
Build and maintain a comprehensive membership management platform for the Serbian Cultural Association in Täby, Sweden. The platform includes member registration, invoice management, event management, content management (news, gallery, Serbian stories), and an admin panel with role-based access control.

## Current Application Architecture
- **Frontend:** React with TailwindCSS, Shadcn UI components
- **Backend:** FastAPI (Python) with GZip compression, uvloop, httptools
- **Database:** MongoDB with optimized indexes
- **Email:** SMTP via Loopia (environment-based configuration)
- **Caching:** In-memory cache for frequently accessed data
- **Performance:** Code splitting, lazy loading, virtual lists
- **Deployment:** Docker Compose with health checks, Nginx reverse proxy with SSL

## Deployment Infrastructure
- **Server:** Hetzner Cloud (recommended CX21+)
- **Domain:** srpskoudruzenjetaby.se
- **SSL:** Let's Encrypt via Certbot
- **CI/CD:** GitHub Actions workflow
- **Documentation:** /app/DEPLOYMENT.md

## What's Been Implemented

### Performance Optimizations (COMPLETED - Mar 6-9, 2026)
- **Hero Background Optimization**:
  - Downloaded and converted hero images to WebP format
  - Total: **8.3MB → 0.7MB** (91% reduction)
  - Main hero: **1.3MB → 55KB** (96% reduction!)
  - New endpoint: `/api/settings/hero-images/{filename}`
  - Cache headers: 1 year (`max-age=31536000, immutable`)
- **Image Optimization**:
  - Created `/app/backend/utils/image_optimizer.py` utility
  - News images: Auto-converted to WebP, resized to max 1200x900, ~80% quality
  - Logo: Optimized from 159KB to 10.4KB (93% reduction)
  - Gallery images: WebP conversion with compression
- **Lazy Loading**:
  - Created `/app/frontend/src/components/ui/LazyImage.jsx` component
  - News images now use IntersectionObserver for lazy loading
  - Placeholder animation while images load
- **Cache Headers**:
  - Added 1-year cache headers to image endpoints
  - Updated nginx.conf for API image caching
  - All images: `Cache-Control: public, max-age=31536000, immutable`
- **Frontend Optimizations**:
  - All logo references updated to use WebP format
  - Images load progressively with smooth fade-in

### March 2026

#### Production Deployment Stabilized (COMPLETED - Mar 6, 2026)
- **Status**: GitHub Actions auto-deployment verified working
- **Configuration**:
  - Docker healthchecks for all containers (MongoDB, backend, frontend, nginx)
  - DejaVu fonts for Serbian character support in PDFs
  - SMTP environment variables properly passed to containers
  - CI/CD workflow with automatic health check verification
- **Deployment Flow**: Push to main → Run tests → SSH deploy → Build containers → Health check → Done

### February 2026

#### System Optimization & Deployment Prep (COMPLETED - Feb 3, 2026)
- **Backend Optimizations**:
  - Added uvloop and httptools for async performance
  - Database indexes created on startup (users, invoices, events, news, gallery)
  - Health check endpoint (`/api/health`) for container orchestration
  - Environment-based SMTP configuration (removed hardcoded credentials)
- **Docker Configuration**:
  - Production-ready Dockerfiles with multi-stage builds
  - Resource limits for all containers
  - Health checks for MongoDB, backend, frontend, nginx
  - Certbot container for automatic SSL renewal
- **Nginx Configuration**:
  - HTTP/2 support with SSL
  - Rate limiting (API: 10r/s, Login: 5r/m)
  - Gzip compression for all content types
  - Security headers (HSTS, X-Frame-Options, etc.)
  - Static file caching (1 year for assets)
- **Files Updated**:
  - `/app/docker-compose.yml` - Production-ready with health checks
  - `/app/backend/Dockerfile` - Optimized with uvloop
  - `/app/frontend/Dockerfile` - Multi-stage build with caching
  - `/app/nginx.conf` - Full production configuration
  - `/app/DEPLOYMENT.md` - Comprehensive deployment guide
  - `/app/.github/workflows/deploy-hetzner.yml` - CI/CD workflow

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

#### AdminDashboard Refactoring (IN PROGRESS - Mar 6, 2026)
- **Progress**: Reduced from 5681 lines to 4970 lines (~12.5% reduction)
- **Extracted Components**:
  - `BrandingTab.jsx` - Logo upload, color customization, hero background, website texts (~400 lines)
  - `EventsTab.jsx` - Event listing, attendance buttons, edit/cancel/delete (~150 lines)
- **Previously Extracted**:
  - `CreateInvoiceDialog.jsx` - Invoice creation modal with multi-select
  - `MemberFilters.jsx` - Member filtering with CSV export
  - `StatisticsCards.jsx` - Dashboard statistics display
  - `InvoiceDetailsModal.jsx` - Invoice details popup
  - `UserImpersonation.jsx` - User impersonation dialog
- **Remaining to Extract**:
  - MembersTab (~360 lines)
  - InvoicesTab (~200 lines)
  - ContentTab (~250 lines)
  - SettingsTab (~310 lines)
  - UserManagementTab (~270 lines)
  - PlatformSettingsTab (~485 lines)
- **Component Location**: `/app/frontend/src/components/admin/`

#### User Impersonation (COMPLETED - Feb 3, 2026)
- **Feature**: Super Admins can view the site as any non-superadmin user
- **Security**: Impersonation actions logged in `activity_logs` collection
- **UI Components**:
  - "👤 View As" button in User Management tab (Users & Roles)
  - Purple impersonation banner at top of page when active
  - "Exit Impersonation" button to restore admin session
- **Files**:
  - `/app/backend/routes/admin.py` - POST /api/admin/impersonate/{user_id}
  - `/app/frontend/src/components/ImpersonationBanner.jsx` - Banner component
  - `/app/frontend/src/pages/AdminDashboard.js` - handleImpersonateUser function
- **Testing**: 100% pass rate (8 backend, 6 frontend tests)

#### Admin Dashboard Statistics (VERIFIED WORKING - Feb 3, 2026)
- Statistics correctly display: totalMembers, paidInvoices, unpaidInvoices, totalRevenue
- Recurring issue marked as RESOLVED

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
- Refactor `AdminDashboard.js` (4000+ lines → smaller components)

### P2 - Medium Priority
- User impersonation auditing

### P3 - Future Enhancements
- Enhanced reporting and analytics
- Bulk operations for member management

## Recent Updates (March 2026)

### Attendance Tracking System (COMPLETED - Mar 6, 2026)
- **Admin Features**:
  - Mark physical attendance (Present/Absent) for each confirmed participant
  - "Mark All Present" button for quick bulk update
  - Add walk-in attendees (members who showed up without RSVP)
  - Real-time statistics: Confirmed, Present, No-show, Walk-in, Pending
  - Full attendance history with who marked and when
- **User Features**:
  - Confirm participation for trainings/events
  - Cancel participation with optional reason
  - Email notification sent to training group moderator on status change
- **PWA-Ready**: Mobile-responsive design, ready for future PWA implementation
- **Files Created/Updated**:
  - `/app/frontend/src/components/AttendanceManager.jsx` (NEW) - Attendance tracking UI
  - `/app/backend/routes/events.py` - New attendance endpoints
  - `/app/backend/email_service.py` - Updated notification template with training group
  - `/app/frontend/src/services/api.js` - New attendance API methods
  - `/app/frontend/src/pages/AdminDashboard.js` - Added "Prisustvo" button
- **New API Endpoints**:
  - `GET /api/events/{id}/attendance` - Get full attendance data
  - `POST /api/events/{id}/attendance/{userId}` - Mark single attendance
  - `POST /api/events/{id}/attendance/bulk` - Bulk attendance update
  - `POST /api/events/{id}/attendance/walkin/{userId}` - Add walk-in

### Attendance Report Generation (COMPLETED - Mar 6, 2026)
- **Feature**: Generate downloadable PDF and Excel attendance reports with statistics
- **Bug Fixed**: Route ordering issue - `/reports/attendance` was being matched by `/{event_id}` pattern
- **Resolution**: Moved static report routes BEFORE dynamic event routes in `events.py`
- **Report Modal Features**:
  - Date range filters (From/To)
  - Training group filter
  - **Per-event report option** - Generate report for single event
  - Live preview with statistics (Events, RSVPs, Present, Absent, Walk-in, Avg Rate)
  - Visual attendance rate bar
  - Download as PDF or Excel
- **Serbian Character Support**: DejaVu fonts embedded for š, đ, ž, č, ć characters
- **Files Updated**:
  - `/app/backend/routes/events.py` - Route ordering fixed, per-event support added
  - `/app/frontend/src/components/AttendanceReportGenerator.jsx` - Per-event UI added
  - `/app/frontend/src/services/api.js` - event_id parameter support
  - `/app/frontend/src/utils/translations.js` - Attendance button translations
- **API Endpoints** (route order is critical):
  - `GET /api/events/reports/attendance` - Generate PDF or Excel report (format, event_id params)
  - `GET /api/events/reports/attendance/data` - Get report data as JSON for preview
- **Testing**: Backend API tested with curl, PDF generation with embedded fonts verified

### Deleted User Cleanup (COMPLETED - Mar 6, 2026)
- **Issue**: Marking attendance for deleted users caused "User not found" errors
- **Fix**: Backend now gracefully handles deleted users:
  - Returns success with message "User no longer exists - removed from participants"
  - Automatically removes deleted users from event participant lists
  - GET attendance endpoint also cleans up deleted users from events
- **Files Updated**:
  - `/app/backend/routes/events.py` - mark_attendance and get_attendance endpoints

### Button Translation (COMPLETED - Mar 6, 2026)
- **Prisustvo button** now uses translation key `admin.events.attendance`
- Added translations for all 4 languages:
  - Serbian Latin: "Prisustvo / Attendance"
  - Serbian Cyrillic: "Присуство / Attendance"
  - English: "Attendance"
  - Swedish: "Närvaro / Attendance"

### Invoice Credit Note System (COMPLETED - Mar 5, 2026)
- **New Feature**: Admin/Super Admin can now credit any invoice to issue refunds
- **VAT Support**: Configurable VAT rate in Settings → Platform → Bank Details
  - VAT percentage field in Bank Details section
  - Invoices automatically calculate and display: Subtotal, VAT amount, Total
  - Credit Notes also show VAT breakdown
- **Workflow**:
  1. Admin clicks 💳 button on invoice row
  2. Popup dialog requires reason for credit note
  3. System generates Credit Note PDF with unique number (CN-YYYYMMDD-XXX)
  4. Invoice status changes to "Credited"
  5. Email notification sent to member with credit note details
  6. Both documents archived for records
- **Files Created/Updated**:
  - `/app/backend/utils/credit_note_generator.py` - PDF generation for credit notes with VAT
  - `/app/backend/utils/invoice_generator.py` - Updated with VAT calculation
  - `/app/backend/routes/invoices.py` - Added credit endpoints
  - `/app/backend/models.py` - CreditNote models
  - `/app/frontend/src/services/api.js` - Credit note API methods
  - `/app/frontend/src/pages/AdminDashboard.js` - Credit dialog, VAT field in bank details
  - `/app/frontend/src/pages/Dashboard.js` - Credit notes display for users
- **New API Endpoints**:
  - `POST /api/invoices/{id}/credit` - Create credit note
  - `GET /api/invoices/credit-notes/` - All credit notes (admin)
  - `GET /api/invoices/credit-notes/my` - User's credit notes
  - `GET /api/invoices/credit-notes/files/{filename}` - Download credit note PDF

### Email Verification Fix (COMPLETED - Mar 5, 2026)
- **Root Cause**: `docker-compose.yml` was not passing SMTP environment variables to the backend container
- **Files Updated**:
  - `/app/docker-compose.yml` - Added SMTP_*, FRONTEND_URL, JWT_SECRET_KEY environment variables
  - `/app/backend/Dockerfile` - Added curl for healthchecks
  - `/app/backend/email_service.py` - Enhanced error logging for SMTP issues
  - `/app/backend/routes/admin.py` - Added `/api/admin/test-email` endpoint for Super Admins
  - `/app/.env.example` - Template for production environment
- **Production Setup Required**: Create `.env` file in project root with `SMTP_PASSWORD`

### GitHub Actions Auto-Deployment Fix (COMPLETED - Mar 5, 2026)
- **Issue**: `script_stop` parameter was removed in appleboy/ssh-action v1.0.0+
- **Fix**: Updated to `appleboy/ssh-action@v1.2.0`, removed `script_stop`, using `set -e` for error handling
- **Data Safety**: 
  - Added explicit comments in docker-compose.yml warning against `docker-compose down -v`
  - Deployment uses `docker-compose up -d` which preserves all volumes (database, uploads)
  - Named volumes (mongodb_data, uploads_data) persist across deployments
- **Files Updated**:
  - `/app/.github/workflows/deploy-hetzner.yml` - Fixed SSH action, improved health checks
  - `/app/docker-compose.yml` - Added data safety comments, fixed healthchecks

### Open Graph / Social Sharing Fix (COMPLETED - Mar 5, 2026)
- Updated `/app/frontend/public/index.html` with proper meta tags
- Added og:image with Serbian eagle logo
- Title changed from "Emergent | Fullstack App" to "Srpsko Kulturno Udruženje Täby"

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
