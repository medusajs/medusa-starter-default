# Ecommerce Project - Medusa v2 Backend + Next.js Storefront

This project consists of a Medusa v2 backend with admin dashboard and a Next.js 15 storefront, deployed on VPS infrastructure.

Refer [ELO-766](https://sreterminal.atlassian.net/browse/ELO-766)

## Project Structure

```
ecomm/
├── ecomm-admin/        # Medusa v2 backend + admin dashboard
├── ecomm-storefront/   # Next.js 15 storefront
└── CLAUDE.md          # Development guidance
```

## Deployment Setup

### VPS Configuration

**Services:**
- **Admin Backend**: http://207.244.239.243:9000
- **Admin Login**: http://207.244.239.243:9000/app/login
- **Storefront**: http://207.244.239.243:8000

### Storefront Deployment

1. **Repository Setup**
   - Forked from: `https://github.com/medusajs/nextjs-starter-medusa`
   - Repository: `https://github.com/jaichenchlani/ecomm-storefront.git`
   - Deployed to: `/opt/ecomm` folder

2. **Installation Steps**
   ```bash
   sudo npm install
   mv .env.template .env.local
   ```

3. **Environment Configuration**
   - Updated `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in `.env.local`
   - Key obtained from medusa_admin → Settings

4. **Start Service**
   ```bash
   sudo npm run dev
   ```
   - Accessible at: http://207.244.239.243:8000

### Admin Backend Deployment

1. **Repository Setup**
   - Forked from: `https://github.com/medusajs/medusa-starter-default`
   - Repository: `https://github.com/jaichenchlani/ecomm-admin`
   - Deployed to: `/opt/ecomm` folder

2. **Docker Configuration**
   - **Port Management**: 
     - Initially changed port from 9000 → 7000 (webhook conflict)
     - Reverted back to 9000 after resolving conflicts
     - Updated `docker-compose.yml` and `Dockerfile` accordingly
   
3. **Package Management**
   - Switched from `yarn` to `npm` for consistency

4. **Service Validation**
   - Tested and validated: http://207.244.239.243:9000/app/login

5. **Admin User Creation**
   ```bash
   docker compose run --rm medusa npx medusa user -e jaichenchlani@gmail.com -p password
   ```

## Key Customizations

### Port Configuration
- **Admin Backend**: Port 9000 (final configuration)
- **Storefront**: Port 8000

### Environment Integration
- Storefront connects to admin backend via publishable key
- Cross-service communication configured via CORS
- Database and Redis services containerized with Docker

### Package Management
- Standardized on `npm` across both projects
- Avoided `yarn` compatibility issues

## Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Admin Dashboard | http://207.244.239.243:9000/app/login | Backend management |
| Admin API | http://207.244.239.243:9000 | API endpoints |
| Storefront | http://207.244.239.243:8000 | Customer-facing site |

## Admin Credentials
- **Email**: jaichenchlani@gmail.com  
- **Password**: password

## Development Commands

### Admin Backend
```bash
cd ecomm-admin
npm run dev          # Start development server
npm run build        # Build for production
npm run seed         # Seed database
npm run docker:up    # Start Docker services
```

### Storefront
```bash
cd ecomm-storefront  
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
```

## Tech Stack

### Backend (ecomm-admin)
- **Framework**: Medusa v2.12.4
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis
- **Containerization**: Docker + Docker Compose

### Frontend (ecomm-storefront)
- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: @medusajs/ui
- **Payments**: Stripe integration

### Database (postgres) - Refer [ELO-774](https://sreterminal.atlassian.net/browse/ELO-774)
- Installed postgres client. `sudo apt install postgresql-client-common postgresql-client`
- `psql -h localhost -p 5432 -U postgres -d medusa-store` # Connect to the db medusa-store
- Commands:
1. `\l` List all databases:
2. `\dt` List all tables in current database
3. `\d` table_name Describe a specific table structure
4. `\dt+` Show all tables with more details
5. `\dn` List all schemas
- `docker volume inspect ecomm-admin_postgres_data`
- `sudo ls -la /var/lib/docker/volumes/ecomm-admin_postgres_data/_data`

## Next Steps

- Configure SSL certificates for HTTPS
- Set up domain mapping
- Implement backup strategies
- Configure monitoring and logging
- Set up CI/CD pipeline