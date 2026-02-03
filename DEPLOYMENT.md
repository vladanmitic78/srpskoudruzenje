# SKUD Täby - Hetzner Deployment Guide

## Prerequisites

1. **Hetzner Cloud Server**
   - Recommended: CX21 or higher (2 vCPU, 4GB RAM)
   - Ubuntu 22.04 LTS
   - Docker and Docker Compose installed

2. **Domain Configuration**
   - Domain: srpskoudruzenjetaby.se
   - DNS A record pointing to server IP
   - DNS CNAME for www subdomain

## Deployment Steps

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app directory
sudo mkdir -p /opt/skud-taby
sudo chown $USER:$USER /opt/skud-taby
```

### 2. Clone Repository

```bash
cd /opt/skud-taby
git clone https://github.com/your-repo/skud-member-portal.git .
```

### 3. Configure Environment

```bash
# Copy and edit production environment
cp backend/.env.production.example backend/.env
nano backend/.env

# Update these values:
# - JWT_SECRET (generate with: openssl rand -hex 32)
# - SMTP_PASSWORD
```

### 4. SSL Certificate Setup

```bash
# Create certbot directories
mkdir -p certbot/conf certbot/www

# Get initial SSL certificate (stop nginx first if running)
docker run -it --rm -v ./certbot/conf:/etc/letsencrypt -v ./certbot/www:/var/www/certbot certbot/certbot certonly --standalone -d srpskoudruzenjetaby.se -d www.srpskoudruzenjetaby.se
```

### 5. Build and Deploy

```bash
# Build and start all services
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f
```

### 6. Verify Deployment

```bash
# Check health endpoints
curl http://localhost/health
curl http://localhost/api/health

# Check HTTPS
curl -I https://srpskoudruzenjetaby.se
```

## Maintenance Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f nginx
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Update Deployment
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build
```

### Database Backup
```bash
# Create backup
docker exec skud_mongodb mongodump --db skud_taby --out /data/backup/$(date +%Y%m%d)

# Restore backup
docker exec skud_mongodb mongorestore --db skud_taby /data/backup/YYYYMMDD/skud_taby
```

### SSL Certificate Renewal
```bash
# Manual renewal (automatic via certbot container)
docker-compose run --rm certbot renew
docker-compose exec nginx nginx -s reload
```

## Performance Monitoring

### Check Resource Usage
```bash
# Docker stats
docker stats

# System resources
htop
```

### Check Service Health
```bash
# Health endpoints
curl http://localhost/api/health

# Container health
docker inspect --format='{{.State.Health.Status}}' skud_backend
```

## Troubleshooting

### Common Issues

1. **SSL Certificate Issues**
   ```bash
   # Check certificate
   docker-compose logs certbot
   
   # Renew manually
   docker-compose run --rm certbot certonly --webroot -w /var/www/certbot -d srpskoudruzenjetaby.se
   ```

2. **Database Connection Issues**
   ```bash
   # Check MongoDB
   docker-compose logs mongodb
   docker exec skud_mongodb mongosh --eval "db.adminCommand('ping')"
   ```

3. **Backend Not Starting**
   ```bash
   # Check logs
   docker-compose logs backend
   
   # Check if port is in use
   sudo lsof -i :8001
   ```

4. **Frontend Build Issues**
   ```bash
   # Rebuild frontend
   docker-compose build --no-cache frontend
   docker-compose up -d frontend
   ```

## Security Checklist

- [ ] Change JWT_SECRET from default
- [ ] Use strong SMTP password
- [ ] Enable firewall (UFW)
- [ ] Set up fail2ban
- [ ] Regular security updates
- [ ] Enable automatic SSL renewal
- [ ] Regular database backups

## Resource Limits

The docker-compose.yml includes resource limits:
- MongoDB: 1GB max memory
- Backend: 1GB max memory
- Frontend: 256MB max memory
- Nginx: 128MB max memory

Adjust these based on your server capacity.

## Contact

For deployment issues, contact the development team.
