# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Medusa v2** ecommerce application starter project that includes both backend API and admin dashboard functionality. It's built with TypeScript and uses Medusa's modular commerce architecture.

## Development Commands

### Core Development
- `npm run dev` - Start development server with hot reload (backend + admin)
- `npm run build` - Build the application for production
- `npm start` - Start production server
- `npm run seed` - Seed database with demo data

### Testing
- `npm run test:unit` - Run unit tests
- `npm run test:integration:http` - Run HTTP integration tests  
- `npm run test:integration:modules` - Run module integration tests

### Docker
- `npm run docker:up` - Start services with Docker Compose
- `npm run docker:down` - Stop Docker services

## Architecture & Structure

### Directory Structure
- `src/api/` - API routes (admin and store endpoints)
  - `admin/` - Admin API endpoints
  - `store/` - Storefront API endpoints
- `src/admin/` - Admin dashboard customizations and i18n
- `src/modules/` - Custom Medusa modules
- `src/workflows/` - Custom workflow definitions
- `src/subscribers/` - Event subscribers
- `src/jobs/` - Background job definitions
- `src/links/` - Module linking definitions
- `src/scripts/` - Utility scripts including seeder
- `integration-tests/` - Integration test suites

### Key Configuration Files
- `medusa-config.ts` - Main Medusa configuration (database, CORS, admin settings)
- `jest.config.js` - Test configuration with environment-specific test patterns
- `tsconfig.json` - TypeScript configuration with Node16 module resolution
- `.env.template` - Environment variable template

### Test Types
The project uses Jest with different test types controlled by `TEST_TYPE` environment variable:
- `integration:http` - Tests in `integration-tests/http/`
- `integration:modules` - Tests in `src/modules/*/__tests__/`
- `unit` - Tests matching `**/*.unit.spec.[jt]s`

### Database & Environment
- Uses PostgreSQL by default (configurable via `DATABASE_URL`)
- Requires Redis for caching (`REDIS_URL`)
- CORS configured for admin (port 5173/9000) and store (port 8000)

### Medusa Framework Details
- Built on **Medusa Framework v2.12.4**
- Uses Medusa's workflow-based architecture for complex operations
- Includes sample products, categories, regions, and fulfillment setup via seeder
- Admin dashboard runs on Vite with HMR configured for Docker development

## Development Notes

- The seeder (`src/scripts/seed.ts`) creates a complete demo store with products, categories, regions, and shipping options
- API routes follow Medusa's convention: export GET/POST/PUT/DELETE functions
- Admin customizations go in `src/admin/`
- Custom business logic should use Medusa's workflow system
- All builds output to `.medusa/` directory