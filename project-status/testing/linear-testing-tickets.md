# Linear Testing Tickets for Custom WebApp Functionality

## Overview
This document contains structured tickets for Linear import to test all custom functionality in the MedusaJS v2 application. The tickets are organized into Epics → Stories → Subtasks with clear dependencies and relationships.

## Ticket Structure
- **Epics**: Major functional areas (e.g., Service Orders Module)
- **Stories**: Feature-level testing (e.g., Service Orders List Page)
- **Subtasks**: Specific test cases and components

---

## EPIC 1: Service Orders Module Testing
**Priority**: High
**Estimate**: 40 points
**Description**: Comprehensive testing of the custom Service Orders module including list views, detail pages, creation flows, and Kanban functionality.

### STORY 1.1: Service Orders List Page Testing
**Priority**: High
**Estimate**: 12 points
**Description**: Test all functionality on the Service Orders list page including tabs, filtering, search, and data display.
**Depends on**: None

#### SUBTASK 1.1.1: Tab Navigation Testing
**Priority**: High
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Backlog tab shows only draft status service orders
- [ ] Active tab shows non-draft status service orders
- [ ] Tab badge counts are accurate and update in real-time
- [ ] Tab switching maintains individual pagination and search states
- [ ] Server-side filtering works correctly for both tabs

#### SUBTASK 1.1.2: View Toggle Functionality
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] List view button toggles to table display correctly
- [ ] Kanban view button toggles to kanban board correctly
- [ ] View state persists when switching between tabs
- [ ] View toggle only appears on Active tab
- [ ] Visual state of toggle buttons reflects current view

#### SUBTASK 1.1.3: Search and Filtering
**Priority**: High
**Estimate**: 4 points
**Acceptance Criteria**:
- [ ] Search works across service_order_number, description, customer_complaint
- [ ] Status filter dropdown includes all custom statuses with correct translations
- [ ] Priority filter includes low, normal, high, urgent options
- [ ] Service type filtering works correctly
- [ ] Customer and technician ID filtering functions properly
- [ ] Date filtering (created_at, scheduled_start_date) works correctly
- [ ] Multiple filters can be combined
- [ ] Filter reset functionality clears all filters
- [ ] URL parameters update correctly with filter changes

#### SUBTASK 1.1.4: Data Display and Formatting
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Service type badges display with correct colors and labels
- [ ] Priority badges display with correct colors and labels
- [ ] Customer names resolve correctly from customer_id
- [ ] Technician names resolve correctly from technician_id
- [ ] "Unassigned" displays for null technician_id
- [ ] Total cost formats correctly as € with cents (€X.XX)
- [ ] All table columns sort correctly
- [ ] Pagination works with correct page sizes

### STORY 1.2: Service Order Detail Page Testing
**Priority**: High
**Estimate**: 15 points
**Description**: Test all widgets and functionality on the Service Order detail page.
**Depends on**: Story 1.1

#### SUBTASK 1.2.1: Page Load and Navigation
**Priority**: High
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Detail page loads correctly with valid service order ID
- [ ] 404 error handling for invalid service order IDs
- [ ] Breadcrumb navigation works correctly
- [ ] Back navigation maintains list page state

#### SUBTASK 1.2.2: Service Order Overview Widget
**Priority**: High
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] All service order details display correctly
- [ ] Service order number shows correctly
- [ ] Status displays with correct badge styling
- [ ] Priority displays with correct badge styling
- [ ] Customer information shows with link to customer detail
- [ ] Machine information shows with link to machine detail
- [ ] Technician information shows correctly (including unassigned state)
- [ ] Dates format correctly
- [ ] Description and complaint fields display properly

#### SUBTASK 1.2.3: Status Actions Widget
**Priority**: High
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Status change dropdown shows valid transitions only
- [ ] Status updates trigger API call to `/admin/service-orders/[id]/status`
- [ ] Status change validation prevents invalid transitions
- [ ] Status history updates after successful change
- [ ] Error handling for failed status changes
- [ ] Loading states during status updates

#### SUBTASK 1.2.4: Service Order Items Widget
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Service items list displays correctly
- [ ] Add new item functionality works
- [ ] Edit existing item functionality works
- [ ] Delete item functionality works with confirmation
- [ ] Item cost calculations are correct
- [ ] Total cost updates when items change

#### SUBTASK 1.2.5: Comments and Time Entries Widgets
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Comments widget displays threaded comments correctly
- [ ] Add comment functionality works
- [ ] Edit/delete comments work correctly
- [ ] Time entries widget shows labor tracking
- [ ] Add time entry functionality works
- [ ] Time aggregation calculations are correct

#### SUBTASK 1.2.6: Status History and Characteristics Widgets
**Priority**: Low
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Status history shows complete audit trail
- [ ] Timestamps and user information are correct
- [ ] Characteristics widget displays custom fields
- [ ] Custom field editing works correctly

### STORY 1.3: Service Order Creation Testing
**Priority**: High
**Estimate**: 8 points
**Description**: Test the service order creation page and form functionality.
**Depends on**: Story 1.1

#### SUBTASK 1.3.1: Form Validation and Required Fields
**Priority**: High
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Description field is required and validates correctly
- [ ] Customer selection is required and validates
- [ ] Machine selection is required and validates
- [ ] Form shows appropriate error messages for missing fields
- [ ] Form prevents submission with invalid data
- [ ] Success message shows after successful creation

#### SUBTASK 1.3.2: Dropdown Integration and Selection
**Priority**: High
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Customer dropdown loads and searches correctly
- [ ] Machine dropdown loads and searches correctly
- [ ] Technician dropdown includes "unassigned" option
- [ ] "Unassigned" technician converts to null in API call
- [ ] Service type selection shows all options with correct labels
- [ ] Priority selection works with correct badge preview

#### SUBTASK 1.3.3: Workflow Integration
**Priority**: High
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] createServiceOrderWorkflow executes successfully
- [ ] Service order number generates automatically
- [ ] Workflow compensation works on failure
- [ ] Created service order appears in list
- [ ] Navigation to detail page works after creation

### STORY 1.4: Kanban View Testing
**Priority**: Medium
**Estimate**: 10 points
**Description**: Test the custom Kanban board functionality for active service orders.
**Depends on**: Story 1.2

#### SUBTASK 1.4.1: Kanban Board Display
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Kanban columns display based on service order statuses
- [ ] Service order cards render with correct information
- [ ] Card styling and layout are consistent
- [ ] Column headers show status names correctly
- [ ] Empty columns display appropriate messaging

#### SUBTASK 1.4.2: Drag and Drop Functionality
**Priority**: Medium
**Estimate**: 4 points
**Acceptance Criteria**:
- [ ] Cards can be dragged between columns
- [ ] Drop zones highlight correctly during drag
- [ ] Status updates trigger on successful drop
- [ ] API call to update status executes correctly
- [ ] Drag validation prevents invalid status transitions
- [ ] Loading states show during status updates
- [ ] Error handling for failed drag operations

#### SUBTASK 1.4.3: Card Interactions
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Clicking card navigates to detail page
- [ ] Card hover states work correctly
- [ ] Card displays essential information (number, customer, priority)
- [ ] Card action buttons function correctly
- [ ] Card styling reflects priority levels

---

## EPIC 2: Purchase Orders Module Testing
**Priority**: High
**Estimate**: 25 points
**Description**: Testing of custom Purchase Orders functionality including listing, creation, receiving workflows, and supplier integration.

### STORY 2.1: Purchase Orders List and Management
**Priority**: High
**Estimate**: 8 points
**Description**: Test purchase orders listing, filtering, and basic management functions.
**Depends on**: None

#### SUBTASK 2.1.1: List Display and Filtering
**Priority**: High
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Purchase orders list loads with supplier expansion
- [ ] Filtering by status, priority, supplier_id works correctly
- [ ] Search functionality across purchase order fields
- [ ] Items count displays when items are expanded
- [ ] Pagination and sorting function correctly

#### SUBTASK 2.1.2: Purchase Order Actions
**Priority**: High
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Create purchase order button opens creation form
- [ ] Edit functionality works from actions dropdown
- [ ] Receive button appears for applicable orders
- [ ] Delete functionality works with confirmation
- [ ] Row click navigation to detail page works

#### SUBTASK 2.1.3: API Integration Testing
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] GET /admin/purchase-orders returns correct data
- [ ] Expand parameters (supplier, items) work correctly
- [ ] Error handling for API failures
- [ ] Loading states display appropriately

### STORY 2.2: Purchase Order Detail and Receiving
**Priority**: High
**Estimate**: 10 points
**Description**: Test purchase order detail page and receiving workflow functionality.
**Depends on**: Story 2.1

#### SUBTASK 2.2.1: Detail Page Display
**Priority**: High
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Purchase order details render correctly
- [ ] Supplier information displays with integration
- [ ] Items list shows with quantities and prices
- [ ] Status and priority display correctly
- [ ] Order totals calculate accurately

#### SUBTASK 2.2.2: Items Management
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Add items to purchase order works
- [ ] Edit item quantities and prices works
- [ ] Remove items functionality works
- [ ] Item validation prevents negative quantities
- [ ] Total calculations update correctly

#### SUBTASK 2.2.3: Receiving Workflow
**Priority**: High
**Estimate**: 4 points
**Acceptance Criteria**:
- [ ] Receive button triggers receiving workflow
- [ ] Partial receiving functionality works correctly
- [ ] Inventory updates process correctly
- [ ] API endpoint /admin/purchase-orders/[id]/receive works
- [ ] Receiving validation prevents over-receiving
- [ ] Status updates after successful receiving

### STORY 2.3: Purchase Order Creation Workflow
**Priority**: Medium
**Estimate**: 7 points
**Description**: Test purchase order creation workflow and draft management.
**Depends on**: Story 2.1

#### SUBTASK 2.3.1: Creation Form and Validation
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Purchase order creation form validates correctly
- [ ] Supplier selection works with dropdown/search
- [ ] Required fields validation prevents submission
- [ ] Form error messages display clearly

#### SUBTASK 2.3.2: Workflow Execution
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] createPurchaseOrderWorkflow executes successfully
- [ ] Supplier validation within workflow
- [ ] Error handling and compensation logic works

#### SUBTASK 2.3.3: Draft Management
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Draft purchase orders can be created and saved
- [ ] Draft to confirmed conversion works
- [ ] API endpoint /admin/purchase-orders/draft/add-item works
- [ ] Draft state persists correctly

---

## EPIC 3: Suppliers and Price Lists Testing
**Priority**: Medium
**Estimate**: 30 points
**Description**: Comprehensive testing of supplier management, price list functionality, and supplier-product relationships.

### STORY 3.1: Supplier List and Basic Management
**Priority**: Medium
**Estimate**: 6 points
**Description**: Test supplier listing, search, and basic CRUD operations.
**Depends on**: None

#### SUBTASK 3.1.1: Supplier List Display
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Suppliers list loads correctly
- [ ] Search functionality works across supplier fields
- [ ] Filtering options work correctly
- [ ] Pagination and sorting function properly

#### SUBTASK 3.1.2: Supplier CRUD Operations
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Create supplier modal (CreateSupplierModal) works
- [ ] Edit supplier functionality works
- [ ] Delete supplier works with confirmation
- [ ] Supplier actions dropdown functions correctly

#### SUBTASK 3.1.3: Navigation and Integration
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Supplier detail page navigation works
- [ ] Breadcrumb navigation functions correctly
- [ ] Back navigation maintains list state

### STORY 3.2: Supplier Detail Page and Sections
**Priority**: Medium
**Estimate**: 12 points
**Description**: Test all supplier detail sections and information management.
**Depends on**: Story 3.1

#### SUBTASK 3.2.1: Supplier Information Sections
**Priority**: Medium
**Estimate**: 4 points
**Acceptance Criteria**:
- [ ] SupplierGeneralSection displays and edits correctly
- [ ] SupplierContactSection displays and edits correctly
- [ ] SupplierAddressSection displays and edits correctly
- [ ] SupplierFinancialSection displays and edits correctly
- [ ] All sections save changes correctly
- [ ] Validation works for each section

#### SUBTASK 3.2.2: Supplier Brands Management
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] SupplierBrandsSection displays correctly
- [ ] Brand associations can be added and removed
- [ ] Brand certification management works
- [ ] API endpoint /admin/suppliers/[id]/brands functions

#### SUBTASK 3.2.3: Supplier Details Widget
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] SupplierDetailsWidget displays information correctly
- [ ] Widget updates when supplier information changes
- [ ] All supplier details are formatted properly

#### SUBTASK 3.2.4: Supplier-Product Integration
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Supplier variant associations display correctly
- [ ] Product sourcing information shows correctly
- [ ] API endpoint /admin/suppliers/[id]/variants works
- [ ] Supplier-product relationship management functions

### STORY 3.3: Price List Management System
**Priority**: High
**Estimate**: 12 points
**Description**: Test comprehensive price list functionality including creation, import, and management.
**Depends on**: Story 3.2

#### SUBTASK 3.3.1: Price List Widget and Display
**Priority**: High
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] SupplierPriceListWidget displays correctly
- [ ] Price list creation functionality works
- [ ] Price list editing works correctly
- [ ] Price list history displays accurately

#### SUBTASK 3.3.2: Price List Import System
**Priority**: High
**Estimate**: 4 points
**Acceptance Criteria**:
- [ ] PriceListUpload component handles CSV files correctly
- [ ] Excel file upload and validation works
- [ ] Import progress tracking displays correctly
- [ ] Import error handling and reporting works
- [ ] API endpoint /admin/suppliers/[id]/price-lists/import functions
- [ ] Price list item validation rules work correctly

#### SUBTASK 3.3.3: Price List Template and Export
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Price list template download works
- [ ] API endpoint /admin/suppliers/[id]/price-lists/template functions
- [ ] Template format is correct and usable
- [ ] Template includes proper headers and examples

#### SUBTASK 3.3.4: Price List Item Management
**Priority**: High
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Add price list items works correctly
- [ ] Edit price list items functions properly
- [ ] Delete price list items works with confirmation
- [ ] Bulk operations on price list items work
- [ ] API endpoints for price list items function correctly
- [ ] Price list item validation prevents invalid data

---

## EPIC 4: Machines and Technicians Testing
**Priority**: Medium
**Estimate**: 20 points
**Description**: Testing of machine management and technician management including brand integration and service order relationships.

### STORY 4.1: Machine Management Testing
**Priority**: Medium
**Estimate**: 10 points
**Description**: Test machine listing, creation, editing, and brand integration.
**Depends on**: None

#### SUBTASK 4.1.1: Machine List and Filtering
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Machines list loads with brand integration
- [ ] Search works across brand, model, serial number
- [ ] Filtering by status, fuel_type, year, purchase_date works
- [ ] Brand name resolution displays correctly
- [ ] Status badges render with custom colors
- [ ] Fuel type displays and formats correctly

#### SUBTASK 4.1.2: Machine CRUD Operations
**Priority**: Medium
**Estimate**: 4 points
**Acceptance Criteria**:
- [ ] CreateMachineForm validates and submits correctly
- [ ] Required fields (brand, model, serial) validation works
- [ ] Brand selection integration functions properly
- [ ] EditMachineForm pre-populates and updates correctly
- [ ] Delete machine functionality works with confirmation
- [ ] Machine actions dropdown functions correctly

#### SUBTASK 4.1.3: Machine Detail and Integration
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Machine detail page displays correctly
- [ ] Brand integration and display works
- [ ] Customer association displays correctly
- [ ] Service order history integration works
- [ ] Machine status management functions properly

### STORY 4.2: Technician Management Testing
**Priority**: Medium
**Estimate**: 10 points
**Description**: Test technician management including service order assignments and brand certifications.
**Depends on**: None

#### SUBTASK 4.2.1: Technician List and Basic Operations
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Technicians list loads correctly
- [ ] Search and filtering functionality works
- [ ] CreateTechnicianForm validation and submission works
- [ ] Technician detail navigation functions correctly

#### SUBTASK 4.2.2: Technician Detail and Forms
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Technician detail page displays correctly
- [ ] EditTechnicianForm pre-populates and updates correctly
- [ ] Brand certification management works
- [ ] Technician validation rules function properly

#### SUBTASK 4.2.3: Service Order Integration
**Priority**: Medium
**Estimate**: 4 points
**Acceptance Criteria**:
- [ ] TechnicianOpenServiceOrdersWidget displays correctly
- [ ] Assigned service orders show accurately
- [ ] Service order assignment functionality works
- [ ] API endpoint /admin/technicians/[id]/service-orders functions
- [ ] Workload management integration works correctly

---

## EPIC 5: Invoice Generation and PDF Workflows
**Priority**: Medium
**Estimate**: 15 points
**Description**: Testing of custom invoice generation workflows, PDF creation, and invoice management.

### STORY 5.1: Invoice List and Basic Management
**Priority**: Medium
**Estimate**: 5 points
**Description**: Test invoice listing, search, filtering, and basic operations.
**Depends on**: None

#### SUBTASK 5.1.1: Invoice List Display
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Invoices list loads correctly
- [ ] Search and filtering work across invoice fields
- [ ] Sorting functionality works properly
- [ ] Invoice status management functions correctly

#### SUBTASK 5.1.2: Invoice Navigation and Actions
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Invoice detail navigation works correctly
- [ ] PDF generation functionality works
- [ ] Invoice status updates function properly
- [ ] Invoice actions dropdown works correctly

### STORY 5.2: Invoice Detail and PDF Generation
**Priority**: Medium
**Estimate**: 6 points
**Description**: Test invoice detail display and PDF generation functionality.
**Depends on**: Story 5.1

#### SUBTASK 5.2.1: Invoice Detail Display
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Invoice details render correctly
- [ ] Line items display with accurate formatting
- [ ] Customer information integrates correctly
- [ ] Invoice totals calculate accurately

#### SUBTASK 5.2.2: PDF Generation System
**Priority**: High
**Estimate**: 4 points
**Acceptance Criteria**:
- [ ] PDF download functionality works correctly
- [ ] API endpoint /admin/invoices/[id]/pdf functions
- [ ] PDF content accuracy matches invoice data
- [ ] PDF formatting and layout are correct
- [ ] Error handling for PDF generation failures

### STORY 5.3: Invoice Creation Workflows
**Priority**: High
**Estimate**: 4 points
**Description**: Test custom invoice generation workflows from different sources.
**Depends on**: Story 5.2

#### SUBTASK 5.3.1: Service Order to Invoice Workflow
**Priority**: High
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] createInvoiceFromServiceOrderWorkflow executes correctly
- [ ] Service order data populates accurately in invoice
- [ ] Labor and parts calculations are correct
- [ ] Service item processing works properly

#### SUBTASK 5.3.2: Order to Invoice Workflow
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] createInvoiceFromOrderWorkflow executes correctly
- [ ] Order item mapping to invoice is accurate
- [ ] Price calculations transfer correctly
- [ ] Invoice generation workflow completes successfully

---

## EPIC 6: Brand Management and Integration
**Priority**: Low
**Estimate**: 12 points
**Description**: Testing of brand management system and integration across modules.

### STORY 6.1: Brand Administration
**Priority**: Low
**Estimate**: 6 points
**Description**: Test brand management interface and CRUD operations.
**Depends on**: None

#### SUBTASK 6.1.1: Brand List and Management
**Priority**: Low
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Brands list displays correctly at /settings/brands
- [ ] Brand search functionality works
- [ ] Brand creation and editing work correctly
- [ ] Brand deletion works with proper validation

#### SUBTASK 6.1.2: Brand API Integration
**Priority**: Low
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] createBrandWorkflow executes successfully
- [ ] API endpoint /admin/brands/search functions correctly
- [ ] Brand validation rules work properly
- [ ] Duplicate brand handling works correctly

### STORY 6.2: Brand Integration Components
**Priority**: Low
**Estimate**: 6 points
**Description**: Test brand selection and display components across the application.
**Depends on**: Story 6.1

#### SUBTASK 6.2.1: Brand Selection Components
**Priority**: Low
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] BrandSelect component functions correctly
- [ ] SupplierBrandSelect works with supplier context
- [ ] Brand selection validation works properly
- [ ] Search and filtering in brand selectors work

#### SUBTASK 6.2.2: Brand Display Components
**Priority**: Low
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] VariantBrandChips display correctly
- [ ] ProductBrandOverview widget functions properly
- [ ] VariantBrandManager handles brand assignments correctly
- [ ] Brand information displays consistently across modules

---

## EPIC 7: API and Workflow Integration Testing
**Priority**: High
**Estimate**: 25 points
**Description**: Comprehensive testing of custom API endpoints, workflows, and cross-module integrations.

### STORY 7.1: Custom API Endpoints Testing
**Priority**: High
**Estimate**: 12 points
**Description**: Test all custom API endpoints for functionality, validation, and error handling.
**Depends on**: All previous module stories

#### SUBTASK 7.1.1: Service Orders API Complete Testing
**Priority**: High
**Estimate**: 4 points
**Acceptance Criteria**:
- [ ] GET /admin/service-orders with all query parameters works
- [ ] POST /admin/service-orders validates and creates correctly
- [ ] PUT /admin/service-orders/[id] updates work correctly
- [ ] POST /admin/service-orders/[id]/status validates status transitions
- [ ] Sub-resource APIs (comments, items, time-entries) function correctly
- [ ] Error handling works for all endpoints
- [ ] API response formats are consistent

#### SUBTASK 7.1.2: Purchase Orders and Suppliers API Testing
**Priority**: High
**Estimate**: 4 points
**Acceptance Criteria**:
- [ ] Purchase order APIs with expand parameters work correctly
- [ ] Supplier APIs including price lists function properly
- [ ] Price list import/export APIs work correctly
- [ ] Receiving workflow APIs function properly
- [ ] Validation and error handling work across all endpoints

#### SUBTASK 7.1.3: Supporting Module APIs Testing
**Priority**: Medium
**Estimate**: 4 points
**Acceptance Criteria**:
- [ ] Machines API CRUD operations work correctly
- [ ] Technicians API and service order relationships work
- [ ] Brands API and search functionality work
- [ ] Invoice APIs and PDF generation work
- [ ] All custom API endpoints have proper error handling
- [ ] API authentication and authorization work correctly

### STORY 7.2: Workflow Execution Testing
**Priority**: High
**Estimate**: 8 points
**Description**: Test all custom workflows for execution, validation, and compensation logic.
**Depends on**: Story 7.1

#### SUBTASK 7.2.1: Core Workflow Testing
**Priority**: High
**Estimate**: 4 points
**Acceptance Criteria**:
- [ ] createServiceOrderWorkflow executes without errors
- [ ] createPurchaseOrderWorkflow handles validation correctly
- [ ] Workflow compensation logic works on failures
- [ ] Workflow rollback scenarios function properly
- [ ] Service order number generation works consistently

#### SUBTASK 7.2.2: Invoice and Brand Workflows
**Priority**: Medium
**Estimate**: 4 points
**Acceptance Criteria**:
- [ ] Invoice generation workflows execute correctly
- [ ] PDF generation workflow handles errors properly
- [ ] createBrandWorkflow validates and creates correctly
- [ ] Order with reservations workflow works properly
- [ ] All workflows have proper error handling and logging

### STORY 7.3: Cross-Module Integration Testing
**Priority**: Medium
**Estimate**: 5 points
**Description**: Test integration between different custom modules and data consistency.
**Depends on**: All previous stories

#### SUBTASK 7.3.1: Service Order Integration Chains
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Service order → customer → machine integration works
- [ ] Service order → technician assignment works correctly
- [ ] Service order → invoice generation works end-to-end
- [ ] Service order status changes reflect in all related data

#### SUBTASK 7.3.2: Purchase Order and Supplier Integration
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Purchase order → supplier → price list integration works
- [ ] Supplier → brand → product integration works correctly
- [ ] Purchase order receiving updates inventory correctly
- [ ] Cross-module data consistency is maintained

---

## EPIC 8: Error Handling and Edge Cases
**Priority**: Medium
**Estimate**: 15 points
**Description**: Testing of error scenarios, validation rules, and edge cases across all custom functionality.

### STORY 8.1: Workflow Error Handling
**Priority**: Medium
**Estimate**: 8 points
**Description**: Test error handling, compensation logic, and recovery scenarios in workflows.
**Depends on**: Epic 7

#### SUBTASK 8.1.1: Service Order Workflow Failures
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Workflow compensation executes correctly on failures
- [ ] Service order deletion works in compensation
- [ ] Error messages display clearly to users
- [ ] Partial workflow state rollback works correctly

#### SUBTASK 8.1.2: Invoice Generation Error Handling
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] PDF generation failures are handled gracefully
- [ ] Invoice workflow retry mechanisms work
- [ ] Partial failure recovery works correctly
- [ ] Error logging and reporting function properly

#### SUBTASK 8.1.3: General Workflow Error Scenarios
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Network failure scenarios are handled correctly
- [ ] Database constraint violations are handled properly
- [ ] Timeout scenarios work correctly
- [ ] Concurrent modification conflicts are resolved

### STORY 8.2: Business Rule Validation
**Priority**: Medium
**Estimate**: 7 points
**Description**: Test business rule validation and constraint enforcement.
**Depends on**: All module stories

#### SUBTASK 8.2.1: Service Order Business Rules
**Priority**: Medium
**Estimate**: 3 points
**Acceptance Criteria**:
- [ ] Invalid status transitions are prevented
- [ ] Technician assignment conflicts are detected
- [ ] Machine assignment validation works correctly
- [ ] Service order deletion constraints are enforced

#### SUBTASK 8.2.2: Purchase Order and Supplier Rules
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Purchase order receiving validation prevents over-receiving
- [ ] Supplier deletion constraints are enforced
- [ ] Price list data validation prevents invalid data
- [ ] Purchase order status transition rules work correctly

#### SUBTASK 8.2.3: Cross-Module Validation
**Priority**: Medium
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Brand assignment validation works correctly
- [ ] Customer-machine relationship validation works
- [ ] Supplier-product relationship validation works
- [ ] Data integrity constraints are enforced across modules

---

## EPIC 9: Performance and Security Testing
**Priority**: Low
**Estimate**: 10 points
**Description**: Performance testing of custom functionality and security validation of custom endpoints.

### STORY 9.1: Performance Testing
**Priority**: Low
**Estimate**: 6 points
**Description**: Test performance of custom functionality with realistic data volumes.
**Depends on**: All functional testing

#### SUBTASK 9.1.1: List Performance Testing
**Priority**: Low
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Service orders list performs well with 1000+ orders
- [ ] Kanban view renders efficiently with many cards
- [ ] Search and filtering remain responsive with large datasets
- [ ] Pagination performance is acceptable

#### SUBTASK 9.1.2: Workflow Performance Testing
**Priority**: Low
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Service order creation workflow completes under 2 seconds
- [ ] Invoice generation workflows complete efficiently
- [ ] PDF generation completes within acceptable timeframes
- [ ] Bulk operations perform acceptably

#### SUBTASK 9.1.3: API Performance Testing
**Priority**: Low
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Custom API endpoints respond under 1 second
- [ ] Complex queries with joins perform acceptably
- [ ] File upload operations complete efficiently
- [ ] Concurrent API requests handle properly

### STORY 9.2: Security Testing
**Priority**: Low
**Estimate**: 4 points
**Description**: Test security aspects of custom functionality.
**Depends on**: All functional testing

#### SUBTASK 9.2.1: Access Control Testing
**Priority**: Low
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Service order access controls work correctly
- [ ] Supplier data access restrictions are enforced
- [ ] Price list confidentiality is maintained
- [ ] Technician access to assigned orders only

#### SUBTASK 9.2.2: API Security Testing
**Priority**: Low
**Estimate**: 2 points
**Acceptance Criteria**:
- [ ] Custom API endpoints require proper authorization
- [ ] Workflow execution authorization works correctly
- [ ] Sensitive data is properly masked
- [ ] Input validation prevents injection attacks

---

## Ticket Dependencies Summary

### Critical Path Dependencies:
1. **Service Orders Module** (Epic 1) → **API Testing** (Epic 7) → **Error Handling** (Epic 8)
2. **Purchase Orders** (Epic 2) → **Suppliers** (Epic 3) → **API Testing** (Epic 7)
3. **All Functional Epics** → **Integration Testing** (Story 7.3)
4. **All Functional Testing** → **Performance & Security** (Epic 9)

### Parallel Testing Opportunities:
- **Epic 1** (Service Orders) and **Epic 2** (Purchase Orders) can run in parallel
- **Epic 4** (Machines/Technicians) can run in parallel with others
- **Epic 6** (Brands) can run independently
- **Epic 5** (Invoicing) depends on service orders and purchase orders completion

### Test Environment Requirements:
- Fresh database with master data (customers, products, brands)
- Test supplier data with price lists
- Test technician and machine data
- Sample service orders in various statuses
- Test file uploads for price list import

This structure provides clear organization for Linear import with proper epic/story/subtask hierarchy, dependencies, and estimates for project planning.