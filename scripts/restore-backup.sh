#!/bin/bash

# ===========================================
# SKUD Täby - Restore Backup Script
# Emergency restore from backup
# ===========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}Usage: ./restore-backup.sh <backup_folder>${NC}"
    echo -e "Example: ./restore-backup.sh ./backups/pre_deploy_20260203_120000"
    exit 1
fi

BACKUP_PATH=$1
DB_NAME="skud_taby"

if [ ! -d "$BACKUP_PATH" ]; then
    echo -e "${RED}Backup folder not found: ${BACKUP_PATH}${NC}"
    exit 1
fi

echo -e "${RED}=======================================${NC}"
echo -e "${RED}DATABASE RESTORE${NC}"
echo -e "${RED}=======================================${NC}"
echo -e "${YELLOW}This will restore database from: ${BACKUP_PATH}${NC}"
echo -e "${RED}Current data will be REPLACED${NC}"
echo -e ""
echo -e "${RED}Type 'RESTORE' to confirm:${NC}"
read CONFIRM
if [ "$CONFIRM" != "RESTORE" ]; then
    echo -e "${RED}Restore cancelled${NC}"
    exit 1
fi

# Stop backend to prevent writes
echo -e "\n${YELLOW}Stopping backend...${NC}"
docker-compose -f docker-compose.prod.yml stop backend

# Copy backup to container
echo -e "\n${YELLOW}Copying backup to MongoDB container...${NC}"
docker cp ${BACKUP_PATH}/${DB_NAME} skud_mongodb:/tmp/restore_data

# Restore
echo -e "\n${YELLOW}Restoring database...${NC}"
docker exec skud_mongodb mongosh --eval "db.getSiblingDB('${DB_NAME}').dropDatabase()"
docker exec skud_mongodb mongorestore --db ${DB_NAME} /tmp/restore_data

# Cleanup
docker exec skud_mongodb rm -rf /tmp/restore_data

# Restart
echo -e "\n${YELLOW}Restarting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

echo -e "\n${GREEN}=======================================${NC}"
echo -e "${GREEN}RESTORE COMPLETE${NC}"
echo -e "${GREEN}=======================================${NC}"
