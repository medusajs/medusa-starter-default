# TODO - Medusa E-commerce Project

This file serves as a progress tracker and memory system for development tasks on this Medusa starter project.

## Current Session Tasks

### ✅ Completed

- [x] **Fix Card Import Error in Rental Detail Page** ✅ **COMPLETED**
  - [x] Identify issue: rental detail page importing non-existent `Card` component from `@medusajs/ui`
  - [x] Remove `Card` import from `@medusajs/ui` imports
  - [x] Replace all `Card` components with `Container` components using appropriate styling
  - [x] Add `rounded-lg shadow-sm` classes to maintain card-like appearance
  - [x] Fix icon imports: replace `Truck` with `TruckFast`, `ExclamationTriangle` with `ExclamationCircle`, remove `MapPin`
  - [x] Fix Badge variant prop: replace `variant="outline"` with `color="grey"`
  - [x] **FINAL RESULT**: Rental detail page now uses native Medusa UI components without import errors

- [x] **App Description for User Value Proposition** ✅ **COMPLETED**
  - [x] Create compelling description focusing on user value, not technical details
  - [x] Emphasize modern solution vs legacy system replacement
  - [x] Highlight Belgium market focus and business benefits
  - [x] Target users with existing systems that need replacement due to support ending
  - [x] **FINAL RESULT**: Comprehensive business-focused description highlighting equipment service management, modern technology, Belgium market focus, and migration benefits

- [x] **Fix Invoice Totals Calculation** ✅ **COMPLETED**
  - [x] Fix `listInvoiceLineItems` method call to properly fetch line items by invoice_id
  - [x] Fix `updateInvoices` method calls to use correct MedusaService signature (data, selector)
  - [x] Fix `recalculateInvoiceTotals` to properly sum line item totals without division by 100
  - [x] Fix `changeInvoiceStatus` to use correct method signature
  - [x] Ensure invoice totals are calculated correctly from line items
  - [x] Cast status enum properly to avoid TypeScript errors
  - [x] **FINAL RESULT**: Invoice totals now correctly reflect the sum of all line items

- [x] **Fix Invoice Price Formatting and Totals** ✅ **COMPLETED**
  - [x] Remove incorrect division by 100 from price formatting functions
  - [x] Fix invoice detail page currency formatting to show correct amounts
  - [x] Fix invoice list page currency formatting in data table
  - [x] Ensure invoice totals display correctly (subtotal, tax_amount, discount_amount, total_amount)
  - [x] Maintain Belgium-specific currency formatting (€) throughout
  - [x] **FINAL RESULT**: All invoice prices and totals now display correctly without incorrect division

- [x] **Invoice Implementation Following Native Medusa Patterns** ✅ **COMPLETED**
  - [x] Add proper model relationships between Invoice, InvoiceLineItem, and InvoiceStatusHistory
  - [x] Implement hasMany/belongsTo relationships following native Medusa patterns
  - [x] Fix API route to use Remote Query with proper relationship loading
  - [x] Create comprehensive invoice detail page with customer information
  - [x] Display customer details (name, email, phone, company)
  - [x] Show billing and shipping addresses with proper Belgium formatting
  - [x] List product variants with SKU, variant title, thumbnail, and pricing
  - [x] Display line items in professional table format with quantities and totals
  - [x] Add Belgium-specific currency formatting (€) and date formatting (nl-BE)
  - [x] Include invoice totals with subtotal, discounts, tax (21%), and final amount
  - [x] Add comprehensive sidebar with invoice details, status, and related information
  - [x] Implement proper TypeScript interfaces for all data structures
  - [x] Fix linter errors and follow native Medusa UI component patterns
  - [x] **FINAL RESULT**: Professional invoice detail page showing customer, addresses, product variants, and complete pricing information

- [x] **Fix Invoice Detail Page 404 Issue** ✅ **COMPLETED**
  - [x] Identify missing invoice detail page component causing 404 errors
  - [x] Create invoice detail page structure following native Medusa patterns
  - [x] Implement proper data fetching with React Query
  - [x] Add comprehensive invoice information display with status badges
  - [x] Include line items, totals, and related information sections
  - [x] Add navigation back to invoice list with proper breadcrumb
  - [x] Follow native Medusa UI patterns with TwoColumnPage layout
  - [x] **FINAL RESULT**: Invoice detail pages now work properly without 404 errors

- [x] **Fix Manual Order Stock Reservation Issue** ✅ **COMPLETED**
  - [x] Identify issue where manual order creation doesn't create stock reservations
  - [x] Fix inventory reservation creation in `/admin/orders` endpoint
  - [x] Properly query variants to get inventory item IDs from `inventory_items` relationship
  - [x] Add proper variant inventory management checks (`manage_inventory` flag)
  - [x] Handle required quantity calculations for inventory items
  - [x] Add proper error handling and logging for reservation creation
  - [x] **FINAL RESULT**: Manual orders now properly create stock reservations for fulfillment

- [x] **Service Order Characteristics Widget Implementation** ✅ **COMPLETED**
  - [x] Add boolean fields to ServiceOrder model: has_appointment, needs_replacement_vehicle, includes_minor_maintenance, includes_major_maintenance, is_repeated_repair, includes_cleaning, est_used, ca_used
  - [x] Create database migration for new boolean fields
  - [x] Create ServiceOrderCharacteristicsWidget component with two-column checkbox layout
  - [x] Add widget to service order detail page below status actions
  - [x] Implement direct checkbox interaction (no edit mode required)
  - [x] Update ServiceOrder DTOs to include new fields
  - [x] Test widget functionality and data persistence
  - [x] **FINAL RESULT**: Streamlined service characteristics widget with directly clickable checkboxes

- [x] **Service Order Types Update** ✅ **COMPLETED**
  - [x] Update ServiceOrderType enum to include only: Insurance, Warranty, Internal, Standard, Sales Prep, Quote
  - [x] Update all TypeScript types and DTOs to use new service order types
  - [x] Update translations to include new service type labels
  - [x] Update all UI components with new service type color variants
  - [x] Create database migration to update service_type enum constraint
  - [x] Map existing service types to new types (normal/setup/emergency/preventive → standard)
  - [x] Update color assignments: Standard (green), Warranty (purple), Sales prep (orange), Internal (red), Insurance (blue), Quote (orange)
  - [x] **FINAL RESULT**: Streamlined service order types with consistent color coding throughout the application

- [x] **Time Entry Table Column Simplification** ✅ **COMPLETED**
  - [x] Remove Description and Category columns from time entries table
  - [x] Reorder columns to: Date, Hours & Minutes, Rate, Total
  - [x] Simplify table structure for cleaner, more focused view
  - [x] Maintain Belgium-focused currency display (€) throughout
  - [x] **FINAL RESULT**: Streamlined time entry table showing only essential time tracking information

- [x] **Time Entry Table Format and Edit/Delete Improvements** ✅ **COMPLETED**
  - [x] Update column title from "Hours & Minutes" to "Time"
  - [x] Implement "X hours X minutes" display format (e.g., "2 hours 30 minutes")
  - [x] Add Actions column with edit/delete dropdown menu
  - [x] Add edit modal with pre-filled form data for time entry modification
  - [x] Add delete functionality with confirmation dialog
  - [x] Maintain European date format (DD/MM/YYYY) throughout
  - [x] **FINAL RESULT**: Full CRUD functionality with user-friendly time display format

- [x] **Service Order Timer Implementation** ✅ **COMPLETED**
  - [x] Add start/stop timer mechanism with real-time display
  - [x] Simplified timer to focus only on time logging (removed work description, category, notes)
  - [x] Use native Medusa UI components: Button, Text, Label, Input
  - [x] Use native Medusa icons: PlaySolid, PauseSolid, Stopwatch
  - [x] Automatic time entry creation when timer is stopped with minimal required data
  - [x] Real-time timer display with HH:MM:SS format
  - [x] Inline hourly rate setting with compact design
  - [x] Proper state management and cleanup with useEffect and useRef
  - [x] Integration with existing time entries API and query invalidation
  - [x] Belgium-focused currency display (€) throughout the interface
  - [x] **FINAL RESULT**: Streamlined timer interface focused purely on time tracking

- [x] **Service Order Backlog Implementation** ✅ **COMPLETED**
  - [x] Update service order status workflow: Draft → Ready for Pickup → In Progress → Done → Returned for Review
  - [x] Modify kanban board to show only "Ready for Pickup" and beyond (exclude Draft status)
  - [x] Create separate backlog view for Draft service orders
  - [x] Update model status enum and migrations (Migration20250727094542.ts generated)
  - [x] Update all UI components with new status workflow
  - [x] Update translations for new statuses (English and Dutch)
  - [x] Applied to: Service Order model, types, edit forms, kanban view, list table, translations
  - [x] **FINAL STRUCTURE**: Optimal two-tab layout with view toggle
    - [x] **Backlog Tab**: Shows draft orders in dedicated datatable with badge count
    - [x] **Active Tab**: Shows non-draft orders with List/Kanban view toggle
    - [x] Clean separation between planning (backlog) and execution (active work)
    - [x] Native MedusaJS DataTable styling and functionality throughout
    - [x] Consistent UX with filtering, search, and pagination on all views

- [x] **Service Order Detail Screen Layout Improvements** ✅ **COMPLETED**
  - [x] Remove custom padding from Parts & Items widget table content
  - [x] Remove custom padding from Time Entries widget table content
  - [x] Restructure widgets to follow native Medusa DataTable patterns
  - [x] Fix Badge component props to use `color` instead of `variant`
  - [x] Achieve consistent native Medusa UI styling without extra padding
  - [x] Maintain proper table structure with native padding handling
  - [x] **Button Improvements** ✅ **COMPLETED**
    - [x] Update header action buttons to use `size="small" variant="secondary"`
    - [x] Update table action buttons to use `size="small" variant="transparent"`
    - [x] Update modal buttons to use `size="small"` consistently
    - [x] Update form action buttons to use `size="small"` consistently
    - [x] Achieve native Medusa button patterns throughout all widgets
 
- [x] **Service Order Header Improvements** ✅ **COMPLETED**
  - [x] Replace custom Badge with native StatusBadge for service type
  - [x] Replace priority badge with service type in header
  - [x] Use consistent native Medusa StatusBadge components
  - [x] Add proper color variants for service types
  - [x] Achieve consistent native Medusa UI patterns in header

- [x] **Service Order Label Components Standardization** ✅ **COMPLETED**
  - [x] Replace HTML `<label>` tag with native Medusa `<Label>` component in service-order-comments.tsx
  - [x] Add proper `size="small" weight="plus"` props to all form Label components in service-order-overview.tsx
  - [x] Add proper `size="small" weight="plus"` props to all form Label components in edit-service-order-form.tsx
  - [x] Ensure consistent native Medusa UI Label component usage throughout service order screens
  - [x] Follow [Medusa UI Label documentation](https://docs.medusajs.com/ui/components/label) patterns
  - [x] Achieve consistent typography and visual hierarchy across all form elements

- [x] **Fix Invoice Creation on Fulfillment Creation** ✅ **COMPLETED**
  - [x] Identify issue: subscriber listens for non-existent "order.shipment_created" event
  - [x] Determine correct event: "order.fulfillment_created" for fulfillments
  - [x] Update subscriber to listen for "order.fulfillment_created" event
  - [x] Fix event data structure to use data.order_id instead of data.id
  - [x] Update TypeScript types for proper event payload structure
  - [x] **FINAL RESULT**: Invoice creation now properly triggers when fulfillments are created

- [x] **Service Type & Priority StatusBadge Implementation** ✅ **COMPLETED**
  - [x] Replace regular `Badge` components with native `StatusBadge` components in service-order-overview.tsx
  - [x] Replace regular `Badge` component with native `StatusBadge` component in service-order-status-actions.tsx
  - [x] Add service type color variants mapping for proper visual distinction
  - [x] Implement colored squares on grey background pattern for service type and priority
  - [x] Achieve native Medusa UI StatusBadge appearance throughout service order detail screen
  - [x] Ensure consistent visual hierarchy with proper color coding for different service types and priorities

- [x] **Service Order DataTable Header Label Standardization** ✅ **COMPLETED**
  - [x] Replace plain text table headers with native `Label` components in service-order-items.tsx
  - [x] Replace plain text table headers with native `Label` components in service-order-time-entries.tsx  
  - [x] Replace plain text table headers with native `Label` components in service-order-status-history.tsx
  - [x] Add proper `size="small" weight="plus"` props to all table header Label components
  - [x] Ensure consistent native Medusa UI Label usage in all datatable headers
  - [x] Follow [Medusa UI Label documentation](https://docs.medusajs.com/ui/components/label) patterns for table headers
  - [x] Achieve consistent typography and visual hierarchy in all service order datatables

- [x] **Update All Datatables to Use Native StatusBadge Components** ✅ **COMPLETED**
  - [x] Replace Badge components with StatusBadge in machines datatable
  - [x] Replace Badge components with StatusBadge in technicians datatable  
  - [x] Replace Badge components with StatusBadge in purchase orders datatable
  - [x] Replace Badge components with StatusBadge in invoices datatable
  - [x] Replace Badge components with StatusBadge in suppliers datatable
  - [x] Update service orders datatable to use StatusBadge consistently
  - [x] Follow [Medusa UI StatusBadge documentation](https://docs.medusajs.com/ui/components/status-badge) patterns
  - [x] Ensure consistent native Medusa UI patterns across all datatables
  - [x] **FINAL RESULT**: All datatables now use native StatusBadge with proper color variants and consistent styling

- [x] **Activity & Comments Section UI Improvements** ✅ **COMPLETED**
  - [x] Change widget title from "Activity & Comments" to "Activity"
  - [x] Remove "All" tab from the tab navigation
  - [x] Keep only "Comments" and "Events" tabs for separate views
  - [x] Change default active tab from "all" to "comments"
  - [x] Update filtering logic to remove "all" case
  - [x] Update empty state messages to remove "all" references
  - [x] **FINAL RESULT**: Clean separation between comments and events with simplified navigation

- [x] **Remove Internal Comment Switch** ✅ **COMPLETED**
  - [x] Remove internal comment switch from CommentForm component
  - [x] Remove isInternal state and related logic
  - [x] Set is_internal to false by default in comment creation
  - [x] Remove unused Switch and Label imports
  - [x] Simplify form layout to only show action buttons
  - [x] **FINAL RESULT**: Cleaner comment form without unnecessary internal comment toggle

- [x] **Service Order Items Product Variant Integration** ✅ **COMPLETED**
  - [x] Replace manual item entry with product variant selection
  - [x] Add product search and selection modal with search functionality
  - [x] Auto-fill description and price from selected variant
  - [x] Only require quantity input from user
  - [x] Update datatable to show proper product variant information
  - [x] Update API endpoint to handle variant_id and product_id
  - [x] Ensure Belgium-focused currency display (€) throughout
  - [x] **FINAL RESULT**: Streamlined item addition with product variant integration

- [x] **Product Search DataTable Refactoring** ✅ **COMPLETED**
  - [x] Replace custom product search layout with native Medusa DataTable
  - [x] Implement proper column structure using createDataTableColumnHelper
  - [x] Add client-side filtering for products and variants
  - [x] Integrate search input with DataTable toolbar
  - [x] Maintain variant selection functionality within DataTable cells
  - [x] **FINAL RESULT**: Clean, native Medusa UI product search interface

- [x] **Product Search DataTable Row Structure Improvement** ✅ **COMPLETED**
  - [x] Refactor to show one row per variant instead of nested structure
  - [x] Implement columns: Product, Description, Variant Type, Price
  - [x] Add clickable rows with hover effects for variant selection
  - [x] Maintain search functionality across all variant data
  - [x] **FINAL RESULT**: Clean, clickable datatable with one row per variant

- [x] **Fix Variant Price Integration Issue** ✅ **COMPLETED**
  - [x] Identify issue where variants without prices were causing unit_price to be 0
  - [x] Add validation to prevent adding variants without prices
  - [x] Update UI to show "No price set" for variants without prices
  - [x] Add error message when trying to add variants without prices
  - [x] **FINAL RESULT**: Proper price validation and user feedback for missing variant prices

- [x] **EUR Price Specific Integration** ✅ **COMPLETED**
  - [x] Update price calculation to specifically look for EUR prices from variant price array
  - [x] Update ProductSearchDataTable to show EUR prices specifically
  - [x] Update selected variant preview to display EUR price
  - [x] Update error messages to mention EUR price specifically
  - [x] **FINAL RESULT**: Proper EUR price handling for multi-currency variants

- [x] **Query API Integration for Calculated Prices** ✅ **COMPLETED**
  - [x] Update product fetching to use Query API with proper context
  - [x] Use calculated_price instead of raw prices array
  - [x] Add EUR currency context for price calculation
  - [x] Update ProductVariant interface to reflect calculated_price structure
  - [x] Update all price display logic to use calculated prices
  - [x] **FINAL RESULT**: Proper calculated EUR prices using Medusa Query API

- [x] **Fix Product Search and Add Customer Context** ✅ **COMPLETED**
  - [x] Revert to GET request for admin products API (POST was incorrect)
  - [x] Add customer data fetching for pricing context
  - [x] Update ServiceOrder interface to include customer_id
  - [x] Revert to using prices array since admin API doesn't support calculated_price directly
  - [x] Maintain EUR price filtering from prices array
  - [x] **FINAL RESULT**: Working product search with customer context for future pricing enhancements

- [x] **Debug and Fix Price Display** ✅ **COMPLETED**
  - [x] Added comprehensive debugging with variants.* and variants.prices.* fields
  - [x] Identified that prices are already in correct format (not in cents)
  - [x] Removed division by 100 from all price calculations and displays
  - [x] Removed all debugging console.log statements
  - [x] **FINAL RESULT**: Correct EUR price display without unnecessary conversion

### ✅ Completed

- [x] **Fix Machine Details Page Issue** ✅ **COMPLETED**
  - [x] Identify the issue: missing machine detail page (`/machines/[id]/page.tsx`)
  - [x] Analyze patterns from native Medusa detail pages and existing service order detail
  - [x] Create machine detail page with TwoColumnPage layout
  - [x] Add machine overview, specifications, and service history sections
  - [x] Implement proper data fetching with React Query
  - [x] Add navigation back to machines list with proper breadcrumb
  - [x] Follow native Medusa UI patterns and Belgium-focused formatting
  - [x] **FINAL RESULT**: Professional machine detail page with comprehensive information display, status badges, and proper navigation

- [x] **Warranties Module Implementation** ✅ **COMPLETED**
  - [x] Plan warranties module architecture following native MedusaJS patterns
  - [x] Create warranty models (Warranty, WarrantyLineItem, WarrantyStatusHistory)
  - [x] Implement WarrantiesService with CRUD operations
  - [x] Create workflow for converting completed warranty service orders to warranties
  - [x] Build admin UI for warranty management
  - [x] Integrate with service orders workflow for automatic warranty creation
  - [x] Create database migration and run it successfully
  - [x] **FINAL RESULT**: Complete warranties module with proper database schema, service layer, and workflow integration for handling warranty service orders separately from invoices

- [x] **Warranties Admin UI Implementation** ✅ **COMPLETED**
  - [x] Create warranties list page with DataTable following Medusa UI patterns
  - [x] Implement comprehensive warranty detail page with TwoColumnPage layout
  - [x] Add proper TypeScript interfaces for all warranty data structures
  - [x] Create StatusBadge components for warranty status and type with color coding
  - [x] Implement Belgium-focused currency formatting (€) and date formatting (nl-BE)
  - [x] Add customer, machine, and service order information display
  - [x] Include line items display with reimbursement tracking
  - [x] Add status history with audit trail
  - [x] Create financial summary with labor costs, parts costs, and reimbursement amounts
  - [x] Add comprehensive translations for warranties module
  - [x] **FINAL RESULT**: Professional admin UI with full CRUD functionality, filtering, search, and detailed warranty management interface

### 🔄 In Progress
- [ ] **Deployment Planning and Setup**
  - [ ] Research and document deployment options (Vercel, Railway, Render, etc.)
  - [ ] Prepare environment variables and configuration for production
  - [ ] Set up database for production deployment
  - [ ] Configure CORS settings for production domains
  - [ ] Test deployment process locally
- [ ] **Fix load-parts-with-prices.ts script compilation and runtime errors**
  - [x] Fixed duplicate variable declarations (partsMap)
  - [x] Added missing helper functions (createRecordFromValues, processRecord)
  - [x] Fixed undefined variable references (logger, container, MEMORY_LIMIT)
  - [x] Removed unused code and simplified structure
  - [ ] Test script execution to ensure it runs without errors
  - [ ] Verify CSV processing and product creation works correctly

### 📋 Pending Tasks
- [ ] Ready for new tasks and feature development

## Project Overview
- **Type**: Medusa e-commerce starter project
- **Tech Stack**: TypeScript, Node.js, Medusa.js
- **Location**: Belgium-focused market
- **Key Files**: 
  - `src/scripts/load-parts-with-prices.ts` - Large CSV import script for parts with price history
  - `src/admin/widgets/service-order-time-entries.tsx` - Time entries widget with simplified timer functionality
  - `TODO.md` - Project progress tracking and memory system

## Notes
- Script is configured to start from line 71000 for resuming large imports
- Uses streaming CSV processing to handle 1.5M+ records efficiently
- Implements memory monitoring and batch processing for optimal performance
- Follows MedusaJS native patterns for product creation and database operations
- Timer feature simplified to focus only on time logging, work details handled elsewhere
- Belgium-focused currency (€) used throughout the interface

*Last updated: Current session - Simplified timer to focus purely on time logging without work details*