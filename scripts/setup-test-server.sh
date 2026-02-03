#!/bin/bash

# ===========================================
# SKUD Täby - Test Server Deployment Script
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}SKUD Täby - Test Server Setup${NC}"
echo -e "${GREEN}=======================================${NC}"

# Check if TEST_SERVER_IP is set
if [ -z "$TEST_SERVER_IP" ]; then
    echo -e "${YELLOW}Enter your test server IP address:${NC}"
    read TEST_SERVER_IP
fi

echo -e "${GREEN}Test Server IP: ${TEST_SERVER_IP}${NC}"

# Step 1: Update system
echo -e "\n${YELLOW}Step 1: Updating system...${NC}"
sudo apt update && sudo apt upgrade -y

# Step 2: Install Docker
echo -e "\n${YELLOW}Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo "Docker already installed"
fi

# Step 3: Install Docker Compose
echo -e "\n${YELLOW}Step 3: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose already installed"
fi

# Step 4: Create app directory
echo -e "\n${YELLOW}Step 4: Setting up application directory...${NC}"
sudo mkdir -p /opt/skud-taby
sudo chown $USER:$USER /opt/skud-taby
cd /opt/skud-taby

# Step 5: Clone or update repository
echo -e "\n${YELLOW}Step 5: Cloning repository...${NC}"
if [ -d ".git" ]; then
    git fetch origin main
    git reset --hard origin/main
else
    echo -e "${YELLOW}Enter your GitHub repository URL:${NC}"
    read REPO_URL
    git clone $REPO_URL .
fi

# Step 6: Create environment file
echo -e "\n${YELLOW}Step 6: Creating environment file...${NC}"
cat > .env << EOF
FRONTEND_URL=http://${TEST_SERVER_IP}
SMTP_PASSWORD=sssstaby2025
JWT_SECRET_KEY=$(openssl rand -hex 32)
EOF

echo -e "${GREEN}Environment file created${NC}"

# Step 7: Create backups directory
mkdir -p backups

# Step 8: Build and start containers
echo -e "\n${YELLOW}Step 7: Building and starting containers...${NC}"
docker-compose -f docker-compose.test.yml build
docker-compose -f docker-compose.test.yml up -d

# Step 9: Wait for services
echo -e "\n${YELLOW}Step 8: Waiting for services to start...${NC}"
sleep 30

# Step 10: Health check
echo -e "\n${YELLOW}Step 9: Running health checks...${NC}"
curl -s http://localhost/api/health || echo "Backend not ready yet"

echo -e "\n${GREEN}=======================================${NC}"
echo -e "${GREEN}Test server setup complete!${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "\nAccess your test site at: ${YELLOW}http://${TEST_SERVER_IP}${NC}"
echo -e "\nNext step: Restore production database using:"
echo -e "${YELLOW}./restore-db-from-production.sh${NC}"
