# Medusa Production Deployment Guide

This guide covers deploying your Medusa application to a VPS using Docker and best practices.

## 🚀 Quick Start

1. **Prepare your VPS** (Ubuntu 20.04+ recommended)
2. **Copy deployment files** to your VPS
3. **Configure environment variables**
4. **Run deployment script**
5. **Setup SSL certificates**

## 📋 Prerequisites

- VPS with Ubuntu 20.04+ or similar
- Domain name pointing to your VPS
- SSH access to your VPS
- Basic knowledge of Linux commands

## 🛠️ VPS Setup

### Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Node.js (for build process)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install nginx -y

# Install certbot for SSL
sudo apt install certbot python3-certbot-nginx -y

# Logout and login again for docker group to take effect
exit
# SSH back in
```

### Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 📁 File Structure

```
your-vps/
├── docker-compose.prod.yml
├── Dockerfile
├── .env.production
├── nginx.conf
├── deploy.sh
├── setup-ssl.sh
└── backups/
```

## ⚙️ Configuration

### 1. Environment Variables

Copy `env.production.example` to `.env.production` and configure:

```bash
cp env.production.example .env.production
nano .env.production
```

**Required variables:**
- `POSTGRES_PASSWORD`: Strong database password
- `JWT_SECRET`: Long random string for JWT signing
- `COOKIE_SECRET`: Long random string for cookie encryption
- `STORE_CORS`: Your domain for CORS
- `ADMIN_CORS`: Admin panel domain
- `AUTH_CORS`: Authentication domains

**Generate secure secrets:**
```bash
# Generate JWT secret
openssl rand -base64 64

# Generate cookie secret
openssl rand -base64 64
```

### 2. Domain Configuration

Update `nginx.conf` with your domain:
```bash
sed -i 's/yourdomain.com/YOUR_ACTUAL_DOMAIN.com/g' nginx.conf
```

## 🚀 Deployment

### 1. Initial Deployment

```bash
# Make scripts executable
chmod +x deploy.sh setup-ssl.sh

# Run deployment
./deploy.sh
```

### 2. Setup SSL Certificates

```bash
# Replace with your domain
./setup-ssl.sh yourdomain.com your-email@domain.com
```

### 3. Verify Deployment

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check application health
curl https://yourdomain.com/health

# View logs
docker-compose -f docker-compose.prod.yml logs -f medusa
```

## 🔄 Updates and Maintenance

### Deploy Updates

```bash
# Pull latest changes
git pull origin main

# Redeploy
./deploy.sh
```

### Database Backups

```bash
# Manual backup
docker exec medusa-db-prod pg_dump -U medusa_user medusa_production > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker exec -i medusa-db-prod psql -U medusa_user medusa_production < backup_file.sql
```

### Monitor Logs

```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs -f medusa

# Database logs
docker-compose -f docker-compose.prod.yml logs -f postgres

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 80, 443, 9000 are free
2. **Permission errors**: Check file permissions and ownership
3. **Database connection**: Verify DATABASE_URL format
4. **SSL issues**: Check certificate paths and permissions

### Debug Commands

```bash
# Check container status
docker ps -a

# View container logs
docker logs medusa-app-prod

# Check nginx configuration
sudo nginx -t

# Test database connection
docker exec medusa-app-prod yarn medusa migrations status
```

## 🔒 Security Best Practices

1. **Use strong passwords** for all services
2. **Keep system updated** regularly
3. **Monitor logs** for suspicious activity
4. **Use firewall** to restrict access
5. **Regular backups** of database and files
6. **SSL certificates** with auto-renewal

## 📊 Performance Optimization

1. **Enable gzip compression** (already configured in nginx)
2. **Use Redis** for caching (included in docker-compose)
3. **Database indexing** for frequently queried fields
4. **CDN** for static assets (consider Cloudflare)
5. **Load balancing** for high traffic (consider multiple VPS instances)

## 🆘 Support

- Check Medusa documentation: https://docs.medusajs.com/
- Review container logs for error messages
- Ensure all environment variables are set correctly
- Verify network connectivity between containers

## 📝 Notes

- The application runs on port 9000 internally
- Nginx proxies external traffic to the application
- Database data is persisted in Docker volumes
- Automatic backups are created before each deployment
- Health checks ensure application availability
