#!/bin/bash

# SSL Certificate Setup Script for Medusa
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔒 Setting up SSL Certificates with Let's Encrypt${NC}"

# Check if domain is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Please provide your domain name${NC}"
    echo "Usage: ./setup-ssl.sh yourdomain.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@$DOMAIN"}

echo -e "${YELLOW}🌐 Domain: $DOMAIN${NC}"
echo -e "${YELLOW}📧 Email: $EMAIL${NC}"

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}📦 Installing certbot...${NC}"
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Stop nginx temporarily
echo -e "${YELLOW}🛑 Stopping Nginx temporarily...${NC}"
sudo systemctl stop nginx

# Obtain SSL certificate
echo -e "${YELLOW}🔐 Obtaining SSL certificate...${NC}"
sudo certbot certonly --standalone \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    --domains $DOMAIN,www.$DOMAIN

# Update nginx configuration
echo -e "${YELLOW}📝 Updating Nginx configuration...${NC}"
sudo cp nginx.conf /etc/nginx/sites-available/$DOMAIN

# Replace domain placeholder
sudo sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/$DOMAIN

# Enable site
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo -e "${YELLOW}🧪 Testing Nginx configuration...${NC}"
sudo nginx -t

# Start nginx
echo -e "${YELLOW}🚀 Starting Nginx...${NC}"
sudo systemctl start nginx
sudo systemctl enable nginx

# Setup auto-renewal
echo -e "${YELLOW}🔄 Setting up auto-renewal...${NC}"
sudo crontab -l 2>/dev/null | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | sudo crontab -

echo -e "${GREEN}✅ SSL setup completed successfully!${NC}"
echo -e "${GREEN}🌐 Your site is now accessible at: https://$DOMAIN${NC}"
echo -e "${YELLOW}📝 Certificates will auto-renew every 60 days${NC}"
