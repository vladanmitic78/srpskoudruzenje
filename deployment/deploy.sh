#!/bin/bash

# ===========================================
# SKUD Täby - Hetzner Deployment Script
# ===========================================

set -e

DOMAIN="srpskoudruzenjetaby.se"
EMAIL="vladanmitic@gmail.com"  # For Let's Encrypt notifications

echo "🚀 SKUD Täby Deployment Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo ./deploy.sh)${NC}"
    exit 1
fi

# Step 1: Update system
echo -e "\n${YELLOW}[1/7] Updating system...${NC}"
apt-get update && apt-get upgrade -y

# Step 2: Install Docker
echo -e "\n${YELLOW}[2/7] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

# Step 3: Install Docker Compose
echo -e "\n${YELLOW}[3/7] Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose installed successfully${NC}"
else
    echo -e "${GREEN}Docker Compose already installed${NC}"
fi

# Step 4: Create project directory
echo -e "\n${YELLOW}[4/7] Setting up project directory...${NC}"
PROJECT_DIR="/opt/skud-taby"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Step 5: Check for .env file
echo -e "\n${YELLOW}[5/7] Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}ERROR: .env file not found!${NC}"
    echo "Please create .env file from .env.example:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi
echo -e "${GREEN}.env file found${NC}"

# Step 6: Initialize SSL certificates
echo -e "\n${YELLOW}[6/7] Setting up SSL certificates...${NC}"
mkdir -p certbot/conf certbot/www

# Check if certificates already exist
if [ ! -d "certbot/conf/live/$DOMAIN" ]; then
    echo "Obtaining SSL certificate from Let's Encrypt..."
    
    # Create temporary nginx config for certificate validation
    cat > nginx-temp.conf << 'TEMPNGINX'
events { worker_connections 1024; }
http {
    server {
        listen 80;
        server_name srpskoudruzenjetaby.se www.srpskoudruzenjetaby.se;
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        location / {
            return 200 'OK';
        }
    }
}
TEMPNGINX

    # Start temporary nginx
    docker run -d --name temp-nginx \
        -p 80:80 \
        -v $(pwd)/nginx-temp.conf:/etc/nginx/nginx.conf:ro \
        -v $(pwd)/certbot/www:/var/www/certbot \
        nginx:alpine

    sleep 5

    # Get certificate
    docker run --rm \
        -v $(pwd)/certbot/conf:/etc/letsencrypt \
        -v $(pwd)/certbot/www:/var/www/certbot \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d www.$DOMAIN

    # Stop and remove temporary nginx
    docker stop temp-nginx
    docker rm temp-nginx
    rm nginx-temp.conf

    echo -e "${GREEN}SSL certificate obtained successfully${NC}"
else
    echo -e "${GREEN}SSL certificate already exists${NC}"
fi

# Step 7: Deploy the application
echo -e "\n${YELLOW}[7/7] Deploying application...${NC}"
docker-compose down --remove-orphans 2>/dev/null || true
docker-compose build --no-cache
docker-compose up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 10

# Check if services are running
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Services status:"
docker-compose ps
echo ""
echo -e "Your site is now available at:"
echo -e "  ${GREEN}https://$DOMAIN${NC}"
echo -e "  ${GREEN}https://www.$DOMAIN${NC}"
echo ""
echo "Useful commands:"
echo "  View logs:     docker-compose logs -f"
echo "  Restart:       docker-compose restart"
echo "  Stop:          docker-compose down"
echo "  Update:        git pull && docker-compose up -d --build"
