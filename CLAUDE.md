# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npx medusa develop` - Start development server
- `npm run seed` - Seed the database with demo data

## Project Architecture

This is a MedusaJS v2 application with a custom ecommerce/service management system. The architecture follows MedusaJS patterns with custom modules and workflows.

### Core Architecture
- **Framework**: MedusaJS v2 with TypeScript
- **Database**: PostgreSQL with MikroORM
- **Admin Panel**: Custom React-based admin interface
- **API**: RESTful API with MedusaJS routes
- **Module System**: Custom business logic modules

### Key Directories

#### `/src/modules/` - Business Logic Modules
Custom MedusaJS modules for business-specific functionality:
- `purchasing/` - Purchase orders, suppliers, and supplier products
- `machines/` - Machine management and tracking
- `service-orders/` - Service order management with status tracking
- `brands/` - Brand management and certifications
- `technicians/` - Technician management and brand certifications
- `invoicing/` - Invoice generation and PDF creation
- `stock-location-details/` - Extended stock location information
- `user-preferences/` - User-specific preferences and settings

#### `/src/admin/` - Admin Interface
React-based admin panel with:
- Custom pages for each business module
- Form components for CRUD operations
- Widgets for dashboard functionality
- TypeScript configuration for admin development

#### `/src/api/` - API Routes
MedusaJS API routes for:
- Admin endpoints (`/admin/*`)
- Custom business logic endpoints
- File uploads and PDF generation

#### `/src/workflows/` - Business Workflows
Step-based workflows for complex business processes:
- Purchase order creation and receiving
- Service order management
- Invoice generation from orders
- Machine and technician workflows

#### `/src/links/` - Data Relationships
Entity relationship definitions for custom modules linking to core MedusaJS entities.

### Custom Module Pattern
Each module follows MedusaJS conventions:
```
/src/modules/{module-name}/
├── index.ts          # Module definition
├── service.ts        # Business logic service
├── models/          # Database models
├── migrations/      # Database migrations
├── workflows/       # Module-specific workflows
├── steps/          # Workflow steps
└── types/          # TypeScript types
```

### Database and Migrations
- Uses MikroORM with PostgreSQL
- Migrations are auto-generated and stored in each module
- Custom entities extend MedusaJS base entities
- Infrastructure: Docker, Redis, Event Bus


### Configuration
- `medusa-config.ts` - Main MedusaJS configuration
- `tsconfig.json` - TypeScript configuration with path mapping
- `jest.config.js` - Testing configuration with different test types

### Development Notes
- Uses yarn as package manager
- Includes MedusaJS source examples in `.medusa-source/` for reference
- Custom admin components use React with MedusaJS admin SDK
- API routes follow MedusaJS conventions with proper error handling


You are an expert in MedusaJS development with deep knowledge of the modular commerce platform.

Key Principles:
- Follow patterns from `.medusa-source/packages/modules/` for module structure
- Use `.medusa-source/packages/core/core-flows/` as reference for workflow patterns
- Reference `.medusa-source/packages/medusa/src/api/` for API route structure
- Follow `.medusa-source/.eslintrc.js` and `.medusa-source/.prettierrc` for code style
- Use native MedusaJS patterns over custom implementations

Architecture Guidelines:
- Use `model.define()` for entities (see product module examples)
- Extend `MedusaService` for module services
- Use `createStep()` and `createWorkflow()` for business logic
- Export modules with `Module(MODULE_NAME, { service })` pattern
- Follow the file structure from native modules

When implementing features:
1. Check `.medusa-source` for existing patterns first
2. Use framework utilities over custom solutions
3. Maintain module composability and type safety
4. Follow established naming and organization conventions

AI Reasoning:
- Always reference native source patterns from `.medusa-source` before suggesting implementations
- Ask clarifying questions when multiple approaches exist in the source
- Prioritize consistency with MedusaJS conventions

- Consider performance and maintainability implications