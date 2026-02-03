#!/bin/bash

# ===========================================
# SKUD Täby - Restore Database from Production
# Copies data from production server (116.203.136.99)
# to test server without affecting production
# ===========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PRODUCTION_IP="116.203.136.99"
DB_NAME="skud_taby"
BACKUP_DIR="/opt/skud-taby/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}Database Restore from Production${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "${YELLOW}Production Server: ${PRODUCTION_IP}${NC}"
echo -e "${YELLOW}Database: ${DB_NAME}${NC}"

# Step 1: Create backup from production
echo -e "\n${YELLOW}Step 1: Creating backup from production server...${NC}"
echo -e "${RED}This requires SSH access to production server${NC}"

# Check if we can connect to production
echo -e "\n${YELLOW}Testing connection to production server...${NC}"
if ssh -o ConnectTimeout=5 root@${PRODUCTION_IP} "echo 'Connected'" 2>/dev/null; then
    echo -e "${GREEN}Connection successful${NC}"
    
    # Create backup on production server
    echo -e "\n${YELLOW}Creating backup on production server...${NC}"
    ssh root@${PRODUCTION_IP} "docker exec skud_mongodb mongodump --db ${DB_NAME} --out /data/backup_${TIMESTAMP}"
    
    # Copy backup to test server
    echo -e "\n${YELLOW}Copying backup to test server...${NC}"
    mkdir -p ${BACKUP_DIR}
    scp -r root@${PRODUCTION_IP}:/data/backup_${TIMESTAMP} ${BACKUP_DIR}/
    
    echo -e "${GREEN}Backup copied successfully${NC}"
else
    echo -e "${RED}Cannot connect to production server via SSH${NC}"
    echo -e "${YELLOW}Alternative: Manual backup method${NC}"
    echo -e "\n${YELLOW}Run these commands manually:${NC}"
    echo -e "1. SSH to production: ${GREEN}ssh root@${PRODUCTION_IP}${NC}"
    echo -e "2. Create backup: ${GREEN}docker exec skud_mongodb mongodump --db ${DB_NAME} --out /data/backup${NC}"
    echo -e "3. Copy backup using SCP or other method to this server at: ${GREEN}${BACKUP_DIR}${NC}"
    echo -e "\nOnce backup is in ${BACKUP_DIR}, run this script again with --restore-only flag"
    
    if [ "$1" != "--restore-only" ]; then
        exit 1
    fi
fi

# Step 2: Stop test containers
echo -e "\n${YELLOW}Step 2: Stopping test containers...${NC}"
cd /opt/skud-taby
docker-compose -f docker-compose.test.yml stop backend

# Step 3: Restore to test MongoDB
echo -e "\n${YELLOW}Step 3: Restoring database to test server...${NC}"

# Find the backup folder
BACKUP_FOLDER=$(ls -td ${BACKUP_DIR}/backup_* 2>/dev/null | head -1)

if [ -z "$BACKUP_FOLDER" ]; then
    echo -e "${RED}No backup found in ${BACKUP_DIR}${NC}"
    exit 1
fi

echo -e "Using backup: ${BACKUP_FOLDER}"

# Copy backup to MongoDB container
docker cp ${BACKUP_FOLDER}/${DB_NAME} skud_mongodb_test:/tmp/restore_${DB_NAME}

# Drop existing test database and restore
docker exec skud_mongodb_test mongosh --eval "db.getSiblingDB('${DB_NAME}').dropDatabase()"
docker exec skud_mongodb_test mongorestore --db ${DB_NAME} /tmp/restore_${DB_NAME}

# Cleanup
docker exec skud_mongodb_test rm -rf /tmp/restore_${DB_NAME}

# Step 4: Restart services
echo -e "\n${YELLOW}Step 4: Restarting services...${NC}"
docker-compose -f docker-compose.test.yml up -d

# Step 5: Verify
echo -e "\n${YELLOW}Step 5: Verifying restoration...${NC}"
sleep 10

# Count users to verify data
USER_COUNT=$(docker exec skud_mongodb_test mongosh --quiet --eval "db.getSiblingDB('${DB_NAME}').users.countDocuments()")
INVOICE_COUNT=$(docker exec skud_mongodb_test mongosh --quiet --eval "db.getSiblingDB('${DB_NAME}').invoices.countDocuments()")

echo -e "\n${GREEN}=======================================${NC}"
echo -e "${GREEN}Database Restore Complete!${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "Users restored: ${YELLOW}${USER_COUNT}${NC}"
echo -e "Invoices restored: ${YELLOW}${INVOICE_COUNT}${NC}"
echo -e "\n${GREEN}Test server now has a copy of production data${NC}"
echo -e "${RED}Note: Any changes on test server will NOT affect production${NC}"
