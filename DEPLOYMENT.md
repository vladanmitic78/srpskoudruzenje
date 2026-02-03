# SKUD Täby - Safe Deployment Guide

## Overview

This guide ensures your **production data is NEVER lost** during deployment.

**Current Production Server:** 116.203.136.99  
**Domain:** srpskoudruzenjetaby.se

## Deployment Strategy

```
┌─────────────────┐         ┌─────────────────┐
│   TEST SERVER   │         │ PRODUCTION      │
│   (New VPS)     │  ───►   │ (116.203.136.99)│
│                 │  After   │                 │
│ - Copy of data  │  testing │ - Real users    │
│ - No SSL       │         │ - SSL enabled   │
│ - Safe to break│         │ - Data preserved│
└─────────────────┘         └─────────────────┘
```

---

## PART 1: Test Server Setup

### Step 1: Create New VPS on Hetzner

1. Go to Hetzner Cloud Console
2. Create new server:
   - **Location:** Same as production (eu-central)
   - **Image:** Ubuntu 22.04
   - **Type:** CX21 (2 vCPU, 4GB RAM) or similar
   - **SSH Key:** Add your SSH key
3. Note the IP address: `YOUR_TEST_IP`

### Step 2: Initial Server Setup

SSH into your new test server:

```bash
ssh root@YOUR_TEST_IP
```

Install Docker:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /opt/skud-taby
cd /opt/skud-taby
```

### Step 3: Clone Repository

```bash
cd /opt/skud-taby
git clone https://github.com/YOUR_REPO/skud-member-portal.git .
```

### Step 4: Configure Environment

```bash
# Create .env file
cat > .env << EOF
FRONTEND_URL=http://YOUR_TEST_IP
SMTP_PASSWORD=sssstaby2025
JWT_SECRET_KEY=$(openssl rand -hex 32)
EOF
```

### Step 5: Build and Start Test Environment

```bash
# Build containers
docker-compose -f docker-compose.test.yml build

# Start services
docker-compose -f docker-compose.test.yml up -d

# Check status
docker-compose -f docker-compose.test.yml ps

# View logs
docker-compose -f docker-compose.test.yml logs -f
```

### Step 6: Copy Production Database to Test

**Option A: If you have SSH access to production:**

```bash
# On TEST server, run:
mkdir -p backups

# SSH to production and create backup
ssh root@116.203.136.99 "docker exec skud_mongodb mongodump --db skud_taby --out /data/backup_test"

# Copy backup to test server
scp -r root@116.203.136.99:/data/backup_test ./backups/

# Restore to test MongoDB
docker cp ./backups/backup_test/skud_taby skud_mongodb_test:/tmp/restore_db
docker exec skud_mongodb_test mongorestore --db skud_taby /tmp/restore_db
docker exec skud_mongodb_test rm -rf /tmp/restore_db

# Restart backend
docker-compose -f docker-compose.test.yml restart backend
```

**Option B: Manual backup (if no SSH access):**

1. On PRODUCTION server:
```bash
docker exec skud_mongodb mongodump --db skud_taby --archive=/data/skud_backup.archive
docker cp skud_mongodb:/data/skud_backup.archive ./skud_backup.archive
```

2. Transfer `skud_backup.archive` to test server (via SCP, SFTP, etc.)

3. On TEST server:
```bash
docker cp skud_backup.archive skud_mongodb_test:/tmp/
docker exec skud_mongodb_test mongorestore --archive=/tmp/skud_backup.archive
```

### Step 7: Test Everything

Access your test site: `http://YOUR_TEST_IP`

**Test checklist:**
- [ ] Login works (try with existing user)
- [ ] Members list shows all users
- [ ] Invoices display correctly
- [ ] PDF invoices download
- [ ] Create new invoice → email sent
- [ ] Events display
- [ ] Gallery works
- [ ] Admin dashboard statistics correct

---

## PART 2: Production Deployment (After Testing)

### ⚠️ IMPORTANT: Only proceed after successful testing!

### Step 1: Create Production Backup

SSH to production server:

```bash
ssh root@116.203.136.99
cd /opt/skud-taby

# Create backup BEFORE any changes
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
docker exec skud_mongodb mongodump --db skud_taby --out /data/backup_${BACKUP_DATE}
mkdir -p backups
docker cp skud_mongodb:/data/backup_${BACKUP_DATE} ./backups/

echo "Backup saved to: ./backups/backup_${BACKUP_DATE}"
```

### Step 2: Pull Latest Code

```bash
cd /opt/skud-taby
git fetch origin main
git reset --hard origin/main
```

### Step 3: Verify Environment File

```bash
# Check .env exists with correct values
cat .env

# If missing, create it:
cat > .env << EOF
SMTP_PASSWORD=your_smtp_password
JWT_SECRET_KEY=your_existing_jwt_key
EOF
```

### Step 4: Deploy (Data Preserved)

```bash
# Build new containers
docker-compose -f docker-compose.prod.yml build

# Restart with new code (volumes/data preserved!)
docker-compose -f docker-compose.prod.yml up -d

# Watch logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 5: Verify Deployment

```bash
# Check health
curl -s http://localhost/api/health

# Verify user count (should match before deployment)
docker exec skud_mongodb mongosh --quiet --eval "db.getSiblingDB('skud_taby').users.countDocuments()"
```

---

## Emergency: Restore from Backup

If something goes wrong:

```bash
cd /opt/skud-taby

# Stop backend
docker-compose -f docker-compose.prod.yml stop backend

# Restore from backup
docker cp ./backups/backup_YYYYMMDD_HHMMSS/skud_taby skud_mongodb:/tmp/restore
docker exec skud_mongodb mongosh --eval "db.getSiblingDB('skud_taby').dropDatabase()"
docker exec skud_mongodb mongorestore --db skud_taby /tmp/restore
docker exec skud_mongodb rm -rf /tmp/restore

# Restart
docker-compose -f docker-compose.prod.yml up -d
```

---

## File Structure

```
/opt/skud-taby/
├── docker-compose.test.yml    # Test environment (no SSL)
├── docker-compose.prod.yml    # Production (with SSL)
├── nginx.test.conf            # Nginx for test (HTTP only)
├── nginx.conf                 # Nginx for production (HTTPS)
├── .env                       # Environment variables
├── scripts/
│   ├── setup-test-server.sh
│   ├── restore-db-from-production.sh
│   ├── deploy-production.sh
│   └── restore-backup.sh
├── backups/                   # Database backups
├── backend/
├── frontend/
└── certbot/                   # SSL certificates (production only)
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `docker-compose -f docker-compose.test.yml up -d` | Start test server |
| `docker-compose -f docker-compose.prod.yml up -d` | Start production |
| `docker-compose logs -f backend` | View backend logs |
| `docker exec skud_mongodb mongodump --db skud_taby --out /data/backup` | Create backup |
| `docker-compose restart backend` | Restart backend only |

---

## Support

If you encounter issues:
1. Check logs: `docker-compose logs -f`
2. Verify database: `docker exec skud_mongodb mongosh --eval "db.getSiblingDB('skud_taby').stats()"`
3. Check health: `curl http://localhost/api/health`
