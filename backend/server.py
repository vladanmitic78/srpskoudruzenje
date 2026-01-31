from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
from datetime import datetime, timedelta
from typing import Optional, List
import shutil

# Import routes
from routes import auth, users, news, events, invoices, gallery, stories, settings, admin, contact, content, family

# Import scheduler
from scheduler import start_scheduler, stop_scheduler

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="SKUD Täby API", version="2.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Upload directory
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
(UPLOAD_DIR / "invoices").mkdir(exist_ok=True)
(UPLOAD_DIR / "gallery").mkdir(exist_ok=True)
(UPLOAD_DIR / "branding").mkdir(exist_ok=True)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Store db in app state for access in routes
app.state.db = db
app.state.upload_dir = UPLOAD_DIR

# Include route modules
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(news.router, prefix="/news", tags=["News"])
api_router.include_router(events.router, prefix="/events", tags=["Events"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(gallery.router, prefix="/gallery", tags=["Gallery"])
api_router.include_router(stories.router, prefix="/stories", tags=["Stories"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(contact.router, prefix="/contact", tags=["Contact"])
api_router.include_router(content.router, prefix="/content", tags=["Content Management"])

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "SKUD Täby API v2.0 - Backend Running", "status": "ok"}

# Public branding endpoint (no auth required)
@api_router.get("/public/branding")
async def get_public_branding():
    """Get branding settings (public endpoint)"""
    branding = await db.branding_settings.find_one({"_id": "branding"})
    
    if not branding:
        # Return default branding settings if none exist
        return {
            "logo": "",
            "colors": {
                "primary": "#C1272D",
                "secondary": "#8B1F1F",
                "buttonPrimary": "#C1272D",
                "buttonHover": "#8B1F1F"
            },
            "language": {
                "default": "sr",
                "supported": ["sr", "en", "sv"]
            }
        }
    
    branding.pop("_id", None)
    branding.pop("emailTemplates", None)  # Don't expose email templates publicly
    return branding

# Include the main API router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    # Stop the scheduler
    stop_scheduler()
    # Close database connection
    client.close()
    logger.info("Application shutdown complete")

@app.on_event("startup")
async def startup_event():
    logger.info("Starting SKUD Täby API...")
    # Initialize default super admin if not exists
    superadmin = await db.users.find_one({"email": "vladanmitic@gmail.com"})
    if not superadmin:
        from auth_utils import hash_password
        await db.users.insert_one({
            "_id": "superadmin_1",
            "username": "vladanmitic@gmail.com",
            "email": "vladanmitic@gmail.com",
            "fullName": "Vladan Mitić",
            "hashed_password": hash_password("Admin123!"),
            "role": "superadmin",
            "emailVerified": True,
            "createdAt": datetime.utcnow()
        })
        logger.info("Super admin account created")
    
    # Initialize settings if not exists
    settings_exist = await db.settings.find_one({})
    if not settings_exist:
        await db.settings.insert_one({
            "_id": "settings_1",
            "address": "Täby Centrum 1, 183 30 Täby",
            "bankAccount": "SE12 3456 7890 1234 5678 90",
            "vatNumber": "SE123456789001",
            "registrationNumber": "802456-1234",
            "contactEmail": "info@srpskoudruzenjetaby.se",
            "contactPhone": "+46 70 123 45 67",
            "socialMedia": {
                "facebook": "https://facebook.com/skudtaby",
                "instagram": "https://instagram.com/skudtaby",
                "youtube": "https://youtube.com/@skudtaby"
            },
            "updatedAt": datetime.utcnow()
        })
        logger.info("Default settings created")
    
    # Start the background scheduler for automated tasks
    start_scheduler(db)
    logger.info("Background scheduler initialized")
