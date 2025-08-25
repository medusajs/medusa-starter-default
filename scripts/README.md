# Medusa Docker Deployment Scripts

This folder contains scripts to build and deploy your Medusa application using Docker multi-stage builds.

## Setup Required

### 1. Configure Docker Registry

Edit the script variables:
- `REGISTRY`: Your Docker registry (e.g., `docker.io/yourusername`, `ghcr.io/yourusername`)
- `IMAGE_NAME`: Your image name (default: `medusa-app`)
- `VPS_HOST`: Your Hetzner VPS IP or hostname
- `VPS_USER`: Your VPS username

### 2. Registry Authentication

Login to your registry locally:
```bash
# Docker Hub
docker login

# GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Or set up in ~/.docker/config.json
```

### 3. VPS Setup

On your VPS, ensure:
- Docker and docker-compose are installed
- You can SSH without password (use SSH keys)
- Your app directory exists with docker-compose.yml

## Usage

### Windows (PowerShell)
```powershell
# Make sure you're in the project root
.\scripts\build-and-deploy.ps1
```

### Linux/Mac (Bash)
```bash
# Make script executable
chmod +x scripts/build-and-deploy.sh

# Run deployment
./scripts/build-and-deploy.sh
```

## Workflow

1. **Build locally** - Uses your powerful machine for compilation
2. **Push to registry** - Stores the built image
3. **Deploy to VPS** - Pulls and runs the pre-built image
4. **Zero VPS build load** - Your CPX22 just runs the container

## Manual Commands

### Build only:
```bash
docker build --target production -t medusa-app:latest .
```

### Test locally:
```bash
docker-compose -f docker-compose.dev.yml up
```

### Deploy only (if image exists in registry):
```bash
ssh user@vps "cd /app && docker-compose pull && docker-compose up -d"
```

## Troubleshooting

### Build fails locally:
- Check if you have enough RAM (increase Docker Desktop memory)
- Try building without cache: `docker build --no-cache`

### VPS deployment fails:
- Check SSH connection: `ssh user@vps`
- Verify docker-compose.yml path on VPS
- Check registry authentication on VPS

### Container won't start:
- Check logs: `docker-compose logs medusa`
- Verify environment variables in .env file
- Ensure Redis is running: `docker-compose ps redis`
