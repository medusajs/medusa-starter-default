# TODO - Medusa E-commerce Project

This file serves as a progress tracker and memory system for development tasks on this Medusa starter project.

## Current Session Tasks

### ✅ Completed

- [x] **Time Entry Table Column Simplification** ✅ **COMPLETED**
  - [x] Remove Description and Category columns from time entries table
  - [x] Reorder columns to: Date, Hours & Minutes, Rate, Total
  - [x] Simplify table structure for cleaner, more focused view
  - [x] Maintain Belgium-focused currency display (€) throughout
  - [x] **FINAL RESULT**: Streamlined time entry table showing only essential time tracking information

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

### 🔄 In Progress
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