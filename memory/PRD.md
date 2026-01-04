# SKUD Täby - Serbian Cultural Association Management System

## Overview
A full-stack web application for managing a Serbian cultural association in Täby, Sweden. The platform supports multi-language content (Serbian Latin, Serbian Cyrillic, English, Swedish), member management, event scheduling, invoicing, and public-facing content.

## Tech Stack
- **Frontend**: React, TailwindCSS, Shadcn UI
- **Backend**: FastAPI, Python
- **Database**: MongoDB
- **Email**: SMTP (Dynamic configuration from admin panel)

## Core Features

### Public Website
- Multi-language support with flag-based language switching
- Home page with news, events, and registration
- Gallery with paginated grid layout (3x3)
- Serbian Story page with paginated grid layout (3x2)
- Contact form with topic-based routing
- About page

### Member Portal
- User registration and authentication
- Profile management
- Event registration
- Invoice viewing and payment tracking

### Admin Dashboard
- **Members Management**: View, search, export (PDF/Excel/XML)
- **Invoices Management**: 
  - Multi-member invoice creation (NEW - Jan 2025)
  - Member filtering and export (NEW - Jan 2025)
  - Mark as paid, upload files
- **Events Management**: Create, edit, cancel events with multi-language support
- **CMS**: News, Gallery, Serbian Story content management
- **Settings**: Contact info, social media, visibility controls

## Completed Features (Jan 2025)

### Multi-Member Invoices
- Create invoices for multiple members at once
- Multi-select with checkboxes in Create Invoice dialog
- Quick select by training group
- Select All / Clear All functionality
- Invoice table shows multiple member names
- Backend supports userIds array

### Member Filtering & Export
- Filter members by invoice, payment status, training group
- Download filtered member lists as Excel/CSV
- Secure export (no sensitive data exposed)

### UI/UX Improvements
- Admin settings visibility toggles (working)
- Responsive grid layouts for Gallery and Serbian Story
- Read More modal for news items
- Clickable language flag switcher
- Platform-wide image optimization

### Bug Fixes
- Email system fixed (SMTP configuration, From header policy)
- Translation keys fixed (searchMembers added)
- Invoice display for multi-member support

## Pending Tasks

### P0 - Critical
- None currently

### P1 - High Priority  
- Refactor AdminDashboard.js (4000+ lines needs splitting)
- Verify admin statistics accuracy

### P2 - Medium Priority
- User impersonation for Super Admins
- Training Groups management UI

### P3 - Low Priority / Backlog
- Admin dashboard statistics review
- Enhanced search functionality

## Data Models

### Invoice
```json
{
  "userIds": ["user_id_1", "user_id_2"],
  "amount": 500.0,
  "currency": "SEK",
  "dueDate": "2025-02-01",
  "description": "Membership Fee",
  "status": "unpaid|paid",
  "trainingGroup": "optional",
  "fileUrl": "/api/invoices/{id}/download"
}
```

### User
```json
{
  "id": "user_xxx",
  "fullName": "Name",
  "email": "email@example.com",
  "role": "user|admin|superadmin",
  "trainingGroup": "optional"
}
```

### Settings Visibility
```json
{
  "visibility": {
    "address": true,
    "contactEmail": true,
    "contactPhone": false,
    "socialMediaFacebook": false,
    "socialMediaInstagram": true,
    "socialMediaYoutube": false,
    "socialMediaSnapchat": false,
    "orgNumber": true,
    "vatNumber": false,
    "bankAccount": false
  }
}
```

## Test Credentials
- **Super Admin**: vladanmitic@gmail.com / Admin123!
- **Admin**: admin@test.com / admin123
- **Moderator**: mitawaybackup@gmail.com / moderator123

## Key Files
- `/app/frontend/src/pages/AdminDashboard.js` - Main admin interface
- `/app/backend/routes/invoices.py` - Invoice API
- `/app/backend/routes/admin.py` - Admin API including filtered members
- `/app/frontend/src/components/Footer.js` - Uses visibility settings
- `/app/frontend/src/utils/translations.js` - Multi-language translations
