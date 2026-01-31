"""
Database Optimization Script
Creates indexes for MongoDB collections to improve query performance
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_indexes():
    """Create all necessary indexes for optimal performance"""
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client[os.environ.get('DB_NAME', 'test_database')]
    
    logger.info("Starting database optimization...")
    
    # Users collection indexes
    logger.info("Creating indexes for 'users' collection...")
    await db.users.create_index("email", unique=True, sparse=True)
    await db.users.create_index("username", sparse=True)
    await db.users.create_index("role")
    await db.users.create_index("primaryAccountId", sparse=True)
    await db.users.create_index("createdAt")
    await db.users.create_index([("fullName", "text"), ("email", "text")])  # Text search
    
    # Invoices collection indexes
    logger.info("Creating indexes for 'invoices' collection...")
    await db.invoices.create_index("userId", sparse=True)
    await db.invoices.create_index("userIds", sparse=True)
    await db.invoices.create_index("status")
    await db.invoices.create_index("dueDate")
    await db.invoices.create_index("createdAt")
    await db.invoices.create_index([("status", 1), ("dueDate", 1)])  # Compound index
    
    # Events collection indexes
    logger.info("Creating indexes for 'events' collection...")
    await db.events.create_index("date")
    await db.events.create_index("type")
    await db.events.create_index("cancelled")
    await db.events.create_index([("date", 1), ("cancelled", 1)])  # Compound index
    await db.events.create_index("createdAt")
    
    # News collection indexes
    logger.info("Creating indexes for 'news' collection...")
    await db.news.create_index("createdAt", background=True)
    await db.news.create_index("published")
    await db.news.create_index([("published", 1), ("createdAt", -1)])
    
    # Gallery collection indexes
    logger.info("Creating indexes for 'gallery' collection...")
    await db.gallery.create_index("albumId", sparse=True)
    await db.gallery.create_index("createdAt")
    await db.gallery.create_index("order", sparse=True)
    
    # Stories collection indexes
    logger.info("Creating indexes for 'stories' collection...")
    await db.stories.create_index("createdAt")
    await db.stories.create_index("published", sparse=True)
    
    # Content collection indexes
    logger.info("Creating indexes for 'content' collection...")
    await db.content.create_index("type")
    await db.content.create_index("slug", unique=True, sparse=True)
    
    # Activity logs (if exists)
    if "activity_logs" in await db.list_collection_names():
        logger.info("Creating indexes for 'activity_logs' collection...")
        await db.activity_logs.create_index("createdAt")
        await db.activity_logs.create_index("userId", sparse=True)
        await db.activity_logs.create_index([("createdAt", -1)], expireAfterSeconds=31536000)  # TTL: 1 year
    
    logger.info("✅ All indexes created successfully!")
    
    # Print index summary
    collections = await db.list_collection_names()
    print("\n📊 Index Summary:")
    for coll in sorted(collections):
        indexes = await db[coll].index_information()
        index_count = len(indexes) - 1  # Exclude _id_
        if index_count > 0:
            print(f"  {coll}: {index_count} custom indexes")

if __name__ == "__main__":
    asyncio.run(create_indexes())
