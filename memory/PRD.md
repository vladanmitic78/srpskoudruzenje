# Serbian Cultural Association (SKUD Täby) - PRD

## Original Problem Statement
Build and maintain a comprehensive membership management platform for the Serbian Cultural Association in Täby, Sweden. The platform includes member registration, invoice management, event management, content management (news, gallery, Serbian stories), and an admin panel with role-based access control.

## Current Application Architecture
- **Frontend:** React with TailwindCSS, Shadcn UI components
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Email:** SMTP via Loopia (dynamic settings from database)

## What's Been Implemented

### December 2025 - January 2026

#### Family/Group Membership System (NEW - Jan 31, 2026)
- Adults (18+) can add family members (children, spouse, friends)
- Each family member gets their own login credentials
- Automatic email with temporary password sent to new members
- Family members visible under parent's account
- Admin can add family members to any user
- Full CRUD operations for family management
- Backend: `/app/backend/routes/family.py`
- Frontend: `/app/frontend/src/components/FamilyMembersSection.jsx`
- API Endpoints:
  - `POST /api/family/members` - Add family member
  - `GET /api/family/members` - List family members
  - `PUT /api/family/members/{id}` - Update family member
  - `DELETE /api/family/members/{id}` - Remove family member
  - `GET /api/family/admin/all` - Admin: Get all families
  - `POST /api/family/admin/members/{user_id}` - Admin: Add member to user

#### Admin Settings Visibility (VERIFIED WORKING)
- Checkboxes in Admin/Settings control field visibility on public pages
- Visibility settings stored in `platform_settings` collection
- Footer respects visibility flags for all fields
- Fields: address, email, phone, social media links, org details

#### Media Optimization System
- Automatic image compression on upload (Pillow library)
- Optimized all existing images via script
- Documentation: `/app/MEDIA_OPTIMIZATION.md`

#### Multi-Member Invoices (Backend Complete)
- Invoice model updated: `userIds: List[str]`
- New endpoint: `POST /api/admin/export/members/filtered`
- Frontend UI pending

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
