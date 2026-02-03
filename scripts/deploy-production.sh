#!/bin/bash

# ===========================================
# SKUD Täby - Production Deployment Script
# SAFE deployment that preserves existing data
# ===========================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}=======================================${NC}"
echo -e "${RED}PRODUCTION DEPLOYMENT${NC}"
echo -e "${RED}=======================================${NC}"
echo -e "${YELLOW}This will update the production server${NC}"
echo -e "${YELLOW}Your database data will be PRESERVED${NC}"
echo -e ""

# Safety confirmation
echo -e "${RED}Have you tested on the test server first? (yes/no)${NC}"
read TESTED
if [ "$TESTED" != "yes" ]; then
    echo -e "${RED}Please test on the test server first!${NC}"
    exit 1
fi

echo -e "${RED}Type 'DEPLOY' to confirm production deployment:${NC}"
read CONFIRM
if [ "$CONFIRM" != "DEPLOY" ]; then
    echo -e "${RED}Deployment cancelled${NC}"
    exit 1
fi

cd /opt/skud-taby

# Step 1: Backup current database BEFORE deployment
echo -e "\n${YELLOW}Step 1: Creating pre-deployment backup...${NC}"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p backups
docker exec skud_mongodb mongodump --db skud_taby --out /data/backup_${BACKUP_DATE}
docker cp skud_mongodb:/data/backup_${BACKUP_DATE} ./backups/pre_deploy_${BACKUP_DATE}
echo -e "${GREEN}Backup saved to: ./backups/pre_deploy_${BACKUP_DATE}${NC}"

# Step 2: Pull latest code
echo -e "\n${YELLOW}Step 2: Pulling latest code...${NC}"
git fetch origin main
git reset --hard origin/main

# Step 3: Check environment file
echo -e "\n${YELLOW}Step 3: Checking environment...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}No .env file found! Creating from template...${NC}"
    echo -e "${YELLOW}Enter SMTP_PASSWORD:${NC}"
    read SMTP_PASS
    echo -e "${YELLOW}Enter JWT_SECRET_KEY (or press Enter to generate):${NC}"
    read JWT_KEY
    if [ -z "$JWT_KEY" ]; then
        JWT_KEY=$(openssl rand -hex 32)
    fi
    cat > .env << EOF
SMTP_PASSWORD=${SMTP_PASS}
JWT_SECRET_KEY=${JWT_KEY}
EOF
fi

# Step 4: Build new images (containers will use existing volumes)
echo -e "\n${YELLOW}Step 4: Building new images...${NC}"
docker-compose -f docker-compose.prod.yml build

# Step 5: Graceful restart (keeps volumes intact)
echo -e "\n${YELLOW}Step 5: Restarting services (data preserved)...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Step 6: Wait and verify
echo -e "\n${YELLOW}Step 6: Waiting for services...${NC}"
sleep 30

# Health check
echo -e "\n${YELLOW}Step 7: Running health checks...${NC}"
for i in 1 2 3 4 5; do
    if curl -sf http://localhost/api/health > /dev/null; then
        echo -e "${GREEN}Backend is healthy!${NC}"
        break
    fi
    echo "Waiting for backend... (attempt $i/5)"
    sleep 5
done

# Verify data is intact
echo -e "\n${YELLOW}Step 8: Verifying data integrity...${NC}"
USER_COUNT=$(docker exec skud_mongodb mongosh --quiet --eval "db.getSiblingDB('skud_taby').users.countDocuments()")
INVOICE_COUNT=$(docker exec skud_mongodb mongosh --quiet --eval "db.getSiblingDB('skud_taby').invoices.countDocuments()")

echo -e "\n${GREEN}=======================================${NC}"
echo -e "${GREEN}PRODUCTION DEPLOYMENT COMPLETE${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "Users in database: ${YELLOW}${USER_COUNT}${NC}"
echo -e "Invoices in database: ${YELLOW}${INVOICE_COUNT}${NC}"
echo -e "\n${GREEN}Backup location: ./backups/pre_deploy_${BACKUP_DATE}${NC}"
echo -e "\n${YELLOW}If something went wrong, restore with:${NC}"
echo -e "${GREEN}./scripts/restore-backup.sh ./backups/pre_deploy_${BACKUP_DATE}${NC}"
