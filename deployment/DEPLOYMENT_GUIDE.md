# SKUD Täby - Hetzner Deployment Guide

## Prerequisites

1. **Hetzner Cloud Server** (CX21 recommended - €5.39/month)
   - Ubuntu 22.04
   - 2 vCPU, 4GB RAM, 40GB SSD

2. **Domain DNS configured** - Point these to your server IP:
   - `srpskoudruzenjetaby.se` → A record → `YOUR_SERVER_IP`
   - `www.srpskoudruzenjetaby.se` → A record → `YOUR_SERVER_IP`

---

## Step-by-Step Deployment

### 1. Create Hetzner Server

1. Go to [console.hetzner.cloud](https://console.hetzner.cloud)
2. Create new project or select existing
3. Add Server:
   - **Location**: Helsinki or Falkenstein (closest to Sweden)
   - **Image**: Ubuntu 22.04
   - **Type**: CX21 (€5.39/mo) or CX11 (€4.51/mo)
   - **SSH Key**: Add your SSH key (recommended)
   - **Name**: `skud-taby-production`

4. Note the **IP address** after creation

### 2. Configure DNS

In your domain registrar (where you bought srpskoudruzenjetaby.se):

```
Type    Name    Value               TTL
A       @       YOUR_SERVER_IP      300
A       www     YOUR_SERVER_IP      300
```

Wait 5-10 minutes for DNS propagation.

### 3. Connect to Server

```bash
ssh root@YOUR_SERVER_IP
```

### 4. Upload Project Files

**Option A: Using Git (Recommended)**
```bash
# On your server
cd /opt
git clone YOUR_REPO_URL skud-taby
cd skud-taby
```

**Option B: Using SCP (from your local machine)**
```bash
# From your local machine
scp -r /path/to/project root@YOUR_SERVER_IP:/opt/skud-taby
```

### 5. Configure Environment

```bash
cd /opt/skud-taby
cp .env.example .env
nano .env
```

Edit the `.env` file:
```env
# Generate a secure JWT secret
JWT_SECRET=run-this-command: openssl rand -hex 32

# Cloudinary (already configured)
CLOUDINARY_CLOUD_NAME=dtdjoij2n
CLOUDINARY_API_KEY=771334849649586
CLOUDINARY_API_SECRET=PolVezDkGq-hZ2RCHaKK4AaMcxY

# SMTP (update with your email provider)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=info@srpskoudruzenjetaby.se
```

### 6. Run Deployment Script

```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

This will:
- Install Docker & Docker Compose
- Obtain SSL certificate from Let's Encrypt
- Build and start all containers
- Set up automatic certificate renewal

### 7. Verify Deployment

Visit:
- https://srpskoudruzenjetaby.se
- https://www.srpskoudruzenjetaby.se

---

## Useful Commands

```bash
# View all containers
docker-compose ps

# View logs (all services)
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend

# Stop everything
docker-compose down

# Update application
git pull
docker-compose up -d --build

# Access MongoDB shell
docker-compose exec mongodb mongosh skud_taby

# Backup database
docker-compose exec mongodb mongodump --db=skud_taby --out=/backup
docker cp skud_mongodb:/backup ./backup-$(date +%Y%m%d)
```

---

## Maintenance

### Automatic SSL Renewal
Certbot container automatically renews certificates every 12 hours.

### Database Backups
Set up a cron job for regular backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 3 AM
0 3 * * * cd /opt/skud-taby && docker-compose exec -T mongodb mongodump --db=skud_taby --archive=/backup/backup-$(date +\%Y\%m\%d).gz --gzip
```

### Monitoring
Check service health:
```bash
curl -s https://srpskoudruzenjetaby.se/api/health
```

---

## Troubleshooting

### SSL Certificate Issues
```bash
# Check certificate status
docker-compose exec certbot certbot certificates

# Force renewal
docker-compose exec certbot certbot renew --force-renewal
docker-compose restart nginx
```

### Container Won't Start
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database Connection Issues
```bash
# Check if MongoDB is running
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb
```

---

## Cost Summary

| Service | Cost |
|---------|------|
| Hetzner CX21 | €5.39/month |
| Domain | ~€10/year |
| SSL | Free (Let's Encrypt) |
| Cloudinary | Free (25GB) |
| **Total** | **~€6/month** |

---

## Support

For issues with this deployment, check:
1. Docker logs: `docker-compose logs -f`
2. Nginx logs: `docker-compose logs nginx`
3. Server resources: `htop` or `free -m`
