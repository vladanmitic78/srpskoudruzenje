# SKUD Täby - Deployment Guide

## Overview
This guide explains how to deploy the Serbian Cultural Association website from GitHub to Hetzner server.

## Important: Your Data is Safe
- **MongoDB data** is stored in a Docker volume (`mongodb_data`)
- **Uploaded files** are stored in a Docker volume (`uploads_data`)
- These volumes persist across deployments and container rebuilds
- **Never run `docker volume rm`** or `docker system prune -a --volumes`

---

## Option 1: Manual Deployment (Recommended for First Time)

### Step 1: SSH into your server
```bash
ssh root@116.203.136.99
```

### Step 2: Navigate to the project directory
```bash
cd /opt/skud-taby
```

### Step 3: Pull latest code from GitHub
```bash
git fetch origin main
git reset --hard origin/main
```

### Step 4: Rebuild and restart containers (preserves data)
```bash
# Stop frontend, backend, nginx (keep mongodb running)
docker-compose stop frontend backend nginx

# Rebuild only frontend and backend
docker-compose build --no-cache frontend backend

# Start all services
docker-compose up -d
```

### Step 5: Verify deployment
```bash
# Check all containers are running
docker ps

# Check database has data
docker exec skud_mongodb mongosh skud_taby --eval "db.users.countDocuments()"

# Check logs if needed
docker logs skud_backend --tail 20
docker logs skud_nginx --tail 20
```

---

## Option 2: GitHub Actions Deployment

### Prerequisites (One-time setup)
1. Go to your GitHub repository: `https://github.com/vladanmitic78/srpskoudruzenje`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets:
   - `HETZNER_HOST`: `116.203.136.99`
   - `HETZNER_USER`: `root`
   - `HETZNER_SSH_KEY`: Your private SSH key (the one you use to SSH into the server)

### To Deploy:
1. Go to **Actions** tab in your GitHub repository
2. Select "Deploy to Hetzner" workflow
3. Click "Run workflow"
4. Wait for completion

---

## Troubleshooting

### If website shows 404:
```bash
docker-compose restart nginx
```

### If SSL certificates expired:
```bash
docker stop skud_nginx
docker run -it --rm -p 80:80 \
  -v /opt/skud-taby/certbot/conf:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d srpskoudruzenjetaby.se -d www.srpskoudruzenjetaby.se \
  --email vladanmitic@gmail.com --agree-tos --no-eff-email
docker start skud_nginx
```

### If database appears empty:
Check if using correct database name:
```bash
docker exec skud_backend env | grep DB_NAME
# Should show: DB_NAME=skud_taby
```

If it shows `skud_db`, edit docker-compose.yml:
```bash
sed -i 's/DB_NAME=skud_db/DB_NAME=skud_taby/g' /opt/skud-taby/docker-compose.yml
docker-compose up -d --force-recreate backend
```

### To check logs:
```bash
docker logs skud_backend --tail 50
docker logs skud_frontend --tail 50
docker logs skud_nginx --tail 50
docker logs skud_mongodb --tail 50
```

---

## Backup Recommendations

### Backup MongoDB data:
```bash
docker exec skud_mongodb mongodump --db skud_taby --out /data/db/backup
docker cp skud_mongodb:/data/db/backup ./mongodb_backup_$(date +%Y%m%d)
```

### Backup uploaded files:
```bash
docker cp skud_backend:/app/uploads ./uploads_backup_$(date +%Y%m%d)
```

---

## File Structure
```
/opt/skud-taby/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── server.py
│   └── routes/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── docker-compose.yml
├── nginx.conf
├── certbot/
│   └── conf/          # SSL certificates
└── DEPLOYMENT.md      # This file
```

## Docker Volumes (DATA - DO NOT DELETE)
- `skud-taby_mongodb_data` - All database data (users, news, events, etc.)
- `skud-taby_uploads_data` - All uploaded images and files

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| SSH into server | `ssh root@116.203.136.99` |
| Go to project | `cd /opt/skud-taby` |
| Pull updates | `git pull origin main` |
| Rebuild all | `docker-compose build --no-cache` |
| Restart all | `docker-compose up -d` |
| Check status | `docker ps` |
| View logs | `docker logs <container_name> --tail 50` |
| Check users | `docker exec skud_mongodb mongosh skud_taby --eval "db.users.countDocuments()"` |
