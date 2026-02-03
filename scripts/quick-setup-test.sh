#!/bin/bash
# Quick Setup for Test Server 89.167.2.215

set -e
TEST_IP="89.167.2.215"

echo "========================================="
echo "SKUD Täby - Test Server Setup"
echo "Server: $TEST_IP"
echo "========================================="

# Create app directory
mkdir -p /opt/skud-taby
cd /opt/skud-taby

# Create .env file
cat > .env << EOF
FRONTEND_URL=http://89.167.2.215
SMTP_PASSWORD=sssstaby2025
JWT_SECRET_KEY=$(openssl rand -hex 32)
EOF

echo "Environment configured!"
echo ""
echo "Next: Clone your repository and run docker-compose"
