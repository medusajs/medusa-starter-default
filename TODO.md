# TODO - Medusa E-commerce Project

This file serves as a progress tracker and memory system for development tasks on this Medusa starter project.

## Current Session Tasks

### ✅ Completed
- [x] Created TODO.md file for progress tracking
- [x] Examined project structure (Medusa e-commerce starter with TypeScript)
- [x] Establish TODO.md as memory system for tracking development progress
- [x] Created Cursor rule `.cursor/rules/todo-memory-system.mdc` for persistent TODO.md behavior
- [x] Identified brand_name column issue in machine table
- [x] Full-stack migration from brand_name to brand_id for machines module
  - [x] Create migration to drop brand_name column and index
  - [x] Update machine model to use brand_id instead of brand_name
  - [x] Update all DTOs and types to use brand_id
  - [x] Update service layer to handle brand_id
  - [x] Update API endpoints to use brand_id and populate brand info
  - [x] Update admin UI forms to use brand_id dropdown
  - [x] Update admin UI tables and widgets to display brand name via brand_id
  - [x] Test the complete migration
- [x] Moved brands module to settings section
  - [x] Created new settings/brands page at `src/admin/routes/settings/brands/page.tsx`
  - [x] Updated route configuration (removed icon as per settings page conventions)
  - [x] Fixed form validation using proper FormProvider and Controller pattern
  - [x] Updated navigation paths in BrandActions to use `/settings/brands/` prefix
  - [x] Removed old brands page from main admin routes
- [x] Standardize button component usage across all custom modules
  - [x] Replace IconButton with Button component for all action buttons
  - [x] Ensure consistent use of MedusaJS native Button component
  - [x] Apply consistent icon placement and sizing
  - [x] Maintain proper accessibility and styling
  - [x] Standardized gap spacing to `gap-2` for button groups
  - [x] Updated imports to remove unused IconButton references
  - [x] Standardized create buttons above DataTables with consistent variant="secondary"
  - [x] Applied uniform icon usage (Plus from @medusajs/icons) across all create buttons
- [x] Fixed service order creation machines dropdown issue
  - [x] Identified incorrect filtering logic in service order create form
  - [x] Updated machines fetching to use customer_id filter when customer is selected
  - [x] Applied same fix to edit service order form for consistency
  - [x] Improved performance by only fetching machines when customer is selected
  - [x] Ensured proper machine-customer relationship validation
- [x] Fixed technician focus modal not closing after creation
  - [x] Added useState import for modal state management
  - [x] Added isOpen state and setIsOpen handler to CreateTechnicianForm component
  - [x] Updated FocusModal to use controlled state with open and onOpenChange props
  - [x] Added setIsOpen(false) to onSuccess callback to close modal after successful creation
  - [x] Ensured consistent behavior with other modal components in the project
- [x] Fixed technician creation validation error
  - [x] Identified invalid_data error in technician creation API endpoint
  - [x] Added proper validation for required fields (first_name, last_name, email)
  - [x] Added email format validation using regex pattern
  - [x] Implemented data cleaning to convert empty strings to null for optional fields
  - [x] Added specific error handling for unique constraint violations (email, employee_id)
  - [x] Improved error messages to provide clear feedback to users
  - [x] Fixed TypeScript errors in order parameter handling
- [x] Plan service order commenting system implementation
  - [x] Analyzed current service order architecture and MedusaJS native patterns
  - [x] Reviewed order note/comment implementation in MedusaJS core for consistency
  - [x] Designed comprehensive plan following MedusaJS patterns (models, services, API, UI)
  - [x] Planned 4-phase implementation: Backend Foundation, Real-time Infrastructure, Frontend Implementation, Advanced Features
  - [x] Estimated 8-12 days total implementation time across all phases
- [x] **Service Order Event Logging System - Complete Implementation** ✅
  - [x] **Phase 1 - Backend Foundation:**
    - [x] Created ServiceOrderEventLogger helper class with grouping capabilities
    - [x] Implemented event templates for major actions (parts, time entries, status changes)
    - [x] Integrated event logging into service operations (addServiceOrderItem, addTimeEntry, updateServiceOrderStatus)
    - [x] Added removeServiceOrderItem method with event logging
    - [x] Created API endpoint for removing service order items
    - [x] Used existing comment system with author_type="system" for events
    - [x] Implemented time-based event grouping (5-10 min windows with max event limits)
  - [x] **Phase 2 - UI Enhancement:**
    - [x] Updated ServiceOrderCommentsWidget to display events alongside comments
    - [x] Added event filtering toggles (Show Comments/Show Events)
    - [x] Created EventMessage component with visual distinction from comments
    - [x] Added event icons and categorization (Parts/Time/Status)
    - [x] Implemented grouped events expandable details
    - [x] Added delete functionality to service order items widget with proper event logging
    - [x] Integrated comment invalidation to show events in real-time
    - [x] Fixed date formatting bug in formatRelativeTime utility (handle string dates from API)
- [x] **Rework service order detail page layout**
  - [x] Move service details widget to right column sidebar
  - [x] Remove cost summary and total from service details widget
  - [x] Remove status history widget
  - [x] Keep only customer, machine, description, service type and priority in service details
- [x] **Improve service detail page sidebar widgets to be more MedusaJS-native**
  - [x] Restructure service details widget to follow MedusaJS patterns
  - [x] Improve status actions widget layout and UX
  - [x] Add proper action menu and icons following native conventions
  - [x] Enhance visual hierarchy and information display
- [x] **Redesign service details widget as editable drawer-style layout**
  - [x] Simplify design and style like an edit drawer
  - [x] Make customer, machine, description, service type and priority editable
  - [x] Use clean form-style layout with proper field structure
  - [x] Remove complex icon containers and use simple field labels

### 🔄 In Progress
- [ ] **Service Order Event Logging System - Debugging**
  - [x] Fixed metadata field missing from comments query
  - [x] Fixed container resolution issues in event logger
  - [x] Updated event logger to work with service instance directly
  - [x] Added debug logging to track event creation
  - [ ] Test and verify events are appearing in UI after adding parts/time entries

### ✅ Completed
- [x] **Fix navigation blank screen issue between custom modules**
  - [x] Identified the issue: Service orders page has complex component structure with tabs and multiple useQuery hooks
  - [x] Root cause: Component state management and React key conflicts between navigation + React hooks order violation + React Query cache conflicts
  - [x] Implement fix for service orders page component structure
  - [x] Added proper loading states to all module pages (machines, suppliers, technicians, service orders)
  - [x] Fixed React hooks order violation by moving all hooks before conditional returns
  - [x] Added React keys to tab components to prevent conflicts
  - [x] Standardized page component structure across all modules
  - [x] Fixed "technicians.forEach is not a function" TypeError by following MedusaJS native data patterns
  - [x] Added proper array guards and data structure consistency across service orders and kanban components
  - [x] Updated ServiceOrder type definitions to maintain consistency between components
  - [x] **CRITICAL FIX**: Resolved React Query cache conflicts by namespacing query keys
    - [x] Changed service orders page query keys to use "service-orders-customers" and "service-orders-technicians"
    - [x] Updated kanban component query keys to match service orders page
    - [x] Fixed create/edit service order forms to use namespaced keys
    - [x] Updated all service order related widgets and components to use unique query keys
    - [x] Prevented cache pollution between native module queries and service order queries
  - [x] **FINAL FIX**: Resolved "Rendered more hooks than during the previous render" error
    - [x] Moved useDataTable hook call before all conditional returns in ServiceOrdersListTable
    - [x] Relocated all column definitions and data processing before conditional returns
    - [x] Ensured consistent hook order across all page loads and navigation scenarios
    - [x] Fixed the "first load error" that required page refresh to work properly
    - [x] **APPLIED TO ALL PAGES**: Fixed React hooks order violations across all custom modules
      - [x] Fixed machines page - moved useDataTable before conditional returns
      - [x] Fixed suppliers page - moved useDataTable before conditional returns
      - [x] Fixed technicians page - moved useDataTable before conditional returns
      - [x] Fixed invoices page - moved useDataTable before conditional returns
      - [x] Ensured all custom modules follow proper React hooks patterns

### 📋 Pending Tasks
- [ ] Ready for new tasks and feature development

## Project Overview
- **Type**: Medusa e-commerce starter project
- **Tech Stack**: TypeScript, Node.js, Medusa.js
- **Location**: Belgium-focused market
- **Key Files**: 
  - `medusa-config.ts` - Main configuration
  - `src/` - Source code directory
  - Various CSV files for product imports

## Notes
- Project appears to be a Medusa e-commerce platform setup
- Contains product import templates and sample data
- Docker configuration available
- Integration tests configured
- **Previous Issue**: Machine table had brand_name column but database expected brand_id column
- **Solution**: ✅ Full migration completed to use brand_id with proper foreign key relationship to brands table
- **Brands Management**: ✅ Moved from main navigation to Settings section for better organization
  - Now accessible at `/app/settings/brands` instead of `/app/brands`
  - Follows MedusaJS settings page conventions (no icon, proper form handling)
  - Maintains all existing functionality in appropriate configuration context
- **Button Standardization**: ✅ Completed full standardization of button components
  - All action buttons now use native MedusaJS `Button` component consistently
  - Replaced `IconButton` with `Button` for table actions and similar contexts
  - Maintained `IconButton` for appropriate uses (dropdown triggers in ActionMenu components)
  - Standardized spacing with `gap-2` for all button groups
  - Consistent `variant="transparent"` and `size="small"` for table action buttons
  - All icons properly placed inside Button components with consistent sizing (`h-4 w-4`)
  - **Create Buttons**: All create buttons above DataTables now use consistent patterns:
    - `size="small"` and `variant="secondary"`
    - `<Plus className="h-4 w-4" />` icon from `@medusajs/icons`
    - Consistent button text formatting
    - Uniform trigger patterns in Modal components
- **Service Order Commenting System**: 📋 Comprehensive implementation plan completed
  - Will follow MedusaJS native patterns for activity feeds and communication
  - Includes real-time chat functionality using SSE (Server-Sent Events)
  - Architecture: ServiceOrderComment model → Service layer → API endpoints → Real-time UI
  - Integration points: Service order detail page, notification system, activity timeline
  - Advanced features: file attachments, @mentions, comment threading, internal/public visibility

--- 
*Last updated: Current session - Completed comprehensive planning for service order commenting system implementation* 