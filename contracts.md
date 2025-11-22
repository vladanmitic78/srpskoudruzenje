# API Contracts - SKUD Täby Backend Integration

## Overview
This document defines all API endpoints, request/response formats, and integration points between frontend and backend.

---

## Base Configuration

**Backend URL**: From `REACT_APP_BACKEND_URL` env variable
**API Prefix**: `/api`
**Authentication**: JWT Bearer tokens

---

## 1. Authentication Endpoints

### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "fullName": "string",
  "email": "string",
  "phone": "string (optional)",
  "yearOfBirth": "string (optional)",
  "address": "string (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for verification.",
  "userId": "string"
}
```

**Email Sent:**
- Verification email in Serbian and Swedish
- Verification link: `/api/auth/verify-email?token=xxx`

---

### POST /api/auth/login
Login user and get JWT token.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "jwt_token_string",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "fullName": "string",
    "role": "user|admin|superadmin",
    "emailVerified": boolean
  }
}
```

---

### GET /api/auth/verify-email?token=xxx
Verify user email address.

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

### POST /api/auth/forgot-password
Request password reset.

**Request Body:**
```json
{
  "email": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset instructions sent to email"
}
```

---

### POST /api/auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "string",
  "newPassword": "string"
}
```

---

## 2. User Endpoints

### GET /api/users/me
Get current user profile (requires auth).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "fullName": "string",
  "phone": "string",
  "yearOfBirth": "string",
  "address": "string",
  "role": "user|admin|superadmin",
  "emailVerified": boolean,
  "parentName": "string",
  "parentEmail": "string",
  "parentPhone": "string",
  "createdAt": "ISO date"
}
```

---

### PUT /api/users/me
Update current user profile.

**Request Body:**
```json
{
  "fullName": "string",
  "phone": "string",
  "yearOfBirth": "string",
  "address": "string",
  "parentName": "string (if under 18)",
  "parentEmail": "string (if under 18)",
  "parentPhone": "string (if under 18)"
}
```

---

### POST /api/users/cancel-membership
Request membership cancellation.

**Request Body:**
```json
{
  "reason": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Membership cancellation request submitted"
}
```

---

## 3. News Endpoints

### GET /api/news
Get all news articles.

**Query Params:**
- `limit`: number (default: 10)
- `skip`: number (default: 0)

**Response (200):**
```json
{
  "news": [
    {
      "id": "string",
      "date": "ISO date",
      "title": {
        "sr-latin": "string",
        "sr-cyrillic": "string",
        "en": "string",
        "sv": "string"
      },
      "text": {
        "sr-latin": "string",
        "sr-cyrillic": "string",
        "en": "string",
        "sv": "string"
      },
      "image": "url",
      "video": "url (optional)",
      "createdAt": "ISO date"
    }
  ],
  "total": number
}
```

---

### POST /api/news (Admin only)
Create news article.

**Request Body:**
```json
{
  "date": "ISO date",
  "title": {
    "sr-latin": "string",
    "sr-cyrillic": "string",
    "en": "string",
    "sv": "string"
  },
  "text": { ... },
  "image": "url",
  "video": "url (optional)"
}
```

---

### PUT /api/news/:id (Admin only)
Update news article.

---

### DELETE /api/news/:id (Admin only)
Delete news article.

---

## 4. Events/Trainings Endpoints

### GET /api/events
Get all events/trainings.

**Response (200):**
```json
{
  "events": [
    {
      "id": "string",
      "date": "ISO date",
      "time": "string",
      "title": { ... },
      "location": "string",
      "description": { ... },
      "status": "active|cancelled",
      "cancellationReason": "string (if cancelled)"
    }
  ]
}
```

---

### POST /api/events (Admin only)
Create event/training.

---

### PUT /api/events/:id (Admin only)
Update or cancel event.

**Request Body (for cancellation):**
```json
{
  "status": "cancelled",
  "cancellationReason": "string"
}
```

**Side Effect:** Sends email notification to all registered participants.

---

### POST /api/events/:id/confirm
User confirms participation.

**Response (200):**
```json
{
  "success": true,
  "confirmed": true
}
```

**Side Effect:** User added to participant list. Reminder email scheduled for 1 day before event.

---

### DELETE /api/events/:id/confirm
User cancels participation.

---

### GET /api/events/:id/participants (Admin only)
Get list of confirmed participants.

---

## 5. Invoice Endpoints

### GET /api/invoices/my
Get current user's invoices.

**Response (200):**
```json
{
  "invoices": [
    {
      "id": "string",
      "amount": number,
      "currency": "SEK",
      "dueDate": "ISO date",
      "paymentDate": "ISO date (optional)",
      "status": "paid|unpaid",
      "description": "string",
      "fileUrl": "string (optional)"
    }
  ]
}
```

---

### POST /api/invoices (Admin only)
Create invoice for a user.

**Request Body:**
```json
{
  "userId": "string",
  "amount": number,
  "dueDate": "ISO date",
  "description": "string"
}
```

---

### PUT /api/invoices/:id/mark-paid (Admin only)
Mark invoice as paid.

**Request Body:**
```json
{
  "paymentDate": "ISO date"
}
```

---

### POST /api/invoices/:id/upload (Admin only)
Upload invoice file.

**Content-Type:** multipart/form-data
**Field:** `file`

---

## 6. Gallery Endpoints

### GET /api/gallery
Get all gallery items.

**Response (200):**
```json
{
  "items": [
    {
      "id": "string",
      "date": "ISO date",
      "description": { ... },
      "images": ["url1", "url2"],
      "videos": ["url1"]
    }
  ]
}
```

---

### POST /api/gallery (Admin only)
Create gallery item.

---

### POST /api/gallery/:id/upload-image (Admin only)
Upload image to gallery.

---

## 7. Serbian Story Endpoints

### GET /api/stories
Get all Serbian stories.

---

### POST /api/stories (Admin only)
Create story.

---

### PUT /api/stories/:id (Admin only)
Update story.

---

## 8. Settings Endpoints

### GET /api/settings
Get association settings (public).

**Response (200):**
```json
{
  "address": "string",
  "bankAccount": "string",
  "vatNumber": "string",
  "registrationNumber": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "socialMedia": {
    "facebook": "url",
    "instagram": "url",
    "youtube": "url"
  }
}
```

---

### PUT /api/settings (Admin only)
Update settings.

---

## 9. Admin Endpoints

### GET /api/admin/users
Get all users (Admin only).

**Response (200):**
```json
{
  "users": [
    {
      "id": "string",
      "fullName": "string",
      "email": "string",
      "phone": "string",
      "role": "string",
      "emailVerified": boolean,
      "createdAt": "ISO date"
    }
  ]
}
```

---

### GET /api/admin/statistics
Get statistics (Admin only).

**Response (200):**
```json
{
  "totalMembers": number,
  "paidInvoices": number,
  "unpaidInvoices": number,
  "totalRevenue": number,
  "overdueInvoices": number
}
```

---

### POST /api/admin/users/:id/suspend (Super Admin only)
Suspend user account.

---

### DELETE /api/admin/users/:id (Super Admin only)
Delete user account.

---

## 10. Contact Form

### POST /api/contact
Submit contact form.

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "topic": "member|finance|sponsorship|other",
  "message": "string"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Message sent successfully"
}
```

**Side Effect:** Email sent to info@srpskoudruzenjetaby.se

---

## Email Templates

### 1. Registration Verification Email
**Subject (SR):** Verifikacija email adrese - SKUD Täby
**Subject (SV):** E-postverifiering - SKUD Täby

**Content:** As specified in brief with verification link.

---

### 2. Training Reminder Email
**Sent:** 1 day before training
**To:** User + parent email (if applicable)
**Content:** Training details with date, time, location

---

### 3. Training Cancellation Email
**Sent:** When admin cancels training
**To:** All registered participants
**Content:** Cancellation reason and apology

---

### 4. Contact Form Notification
**To:** info@srpskoudruzenjetaby.se
**Content:** Form submission details

---

## File Upload Storage

**Location:** `/app/backend/uploads/`
**Subdirectories:**
- `/invoices/` - Invoice PDFs
- `/gallery/` - Gallery images/videos

**URL Access:** `/api/files/:category/:filename`

---

## Mock Data Migration

**Current Mock Location:** `/app/frontend/src/utils/mock.js`

**Migration Plan:**
1. Seed initial data to MongoDB from mock.js
2. Update all frontend API calls to use axios
3. Remove mock data imports
4. Test each endpoint individually

---

## Error Handling

**Standard Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

---

## Authentication Flow

1. User registers → Email sent → Email verified → Login enabled
2. Login → JWT token returned → Token stored in localStorage
3. Protected routes → Token sent in Authorization header
4. Token expires → User redirected to login

---

## Next Implementation Steps

1. ✅ Create MongoDB models
2. ✅ Set up email service with Loopia SMTP
3. ✅ Build authentication endpoints with JWT
4. ✅ Create CRUD endpoints for all entities
5. ✅ Implement file upload handling
6. ✅ Add email sending for all triggers
7. ✅ Update frontend to use real APIs
8. ✅ Test all flows
9. ✅ Remove mock data

---

**This document serves as the contract between frontend and backend teams.**
