# Custom WebApp Testing Plan

## Overview
This document provides a comprehensive testing plan for the custom modules and functionality built on top of MedusaJS v2. This plan focuses exclusively on custom business logic, custom admin interfaces, and custom workflows, excluding native MedusaJS functionality.

## Test Execution Instructions
This plan is designed to be used as input for AI agents to create specific Linear/Jira issues and execute testing tasks. Each test case should be converted into individual issues with clear acceptance criteria.

---

## 1. Custom Business Modules Testing

### 1.1 Service Orders Module (`/service-orders`)

#### 1.1.1 Service Orders List Page
- **Custom Tab Navigation**
  - Test "Backlog" tab functionality (draft status filtering)
  - Test "Active" tab functionality (non-draft status filtering)
  - Verify tab-specific server-side filtering
  - Test tab badge counts accuracy
- **Custom View Toggle (Active Tab Only)**
  - Test "List" view button functionality
  - Test "Kanban" view button functionality
  - Verify view state persistence between tab switches
- **Custom Search & Filtering**
  - Test search across service_order_number, description, customer_complaint
  - Test custom status filter (draft, ready_for_pickup, in_progress, done, returned_for_review)
  - Test custom priority filter (low, normal, high, urgent)
  - Test service_type filtering
  - Test customer_id and technician_id filtering
  - Test scheduled_start_date filtering
- **Custom Data Display**
  - Test service type badge rendering with correct colors
  - Test priority badge rendering with correct colors
  - Test customer name resolution from customer_id
  - Test technician name resolution from technician_id
  - Test total_cost formatting (€ with cents)
- **Custom Actions**
  - Test custom EditServiceOrderForm modal trigger
  - Test custom delete functionality (with confirmation)
  - Test service order actions dropdown menu

#### 1.1.2 Service Order Detail Page (`/service-orders/[id]`)
- **Custom Widgets Testing**
  - Test Service Order Overview widget display and functionality
  - Test Service Order Status Actions widget (custom status changes)
  - Test Service Order Items widget (add/edit/remove service items)
  - Test Service Order Comments widget (threaded comments system)
  - Test Service Order Time Entries widget (labor tracking)
  - Test Service Order Status History widget (audit trail)
  - Test Service Order Characteristics widget (custom fields)
- **Custom Status Management**
  - Test custom status transition rules and validation
  - Test status change API integration (`POST /admin/service-orders/[id]/status`)
  - Verify status history tracking
- **Custom Business Logic**
  - Test service order number generation
  - Test total cost calculation
  - Test time entry aggregation
  - Test item cost calculation

#### 1.1.3 Create Service Order Page (`/service-orders/create`)
- **Custom Form Validation**
  - Test required field validation (description, customer, machine)
  - Test custom business rule validation
  - Test service type selection validation
- **Custom Integrations**
  - Test customer dropdown integration with customer module
  - Test machine dropdown integration with machines module
  - Test technician assignment with "unassigned" option handling
- **Custom Workflow Integration**
  - Test createServiceOrderWorkflow execution
  - Test service order number auto-generation
  - Test compensation logic on workflow failure

#### 1.1.4 Custom Kanban View
- **Kanban Board Implementation**
  - Test custom kanban column creation based on service order statuses
  - Test kanban card rendering with service order data
  - Test custom card styling and information display
- **Custom Drag & Drop**
  - Test drag and drop functionality between status columns
  - Test status update API calls on card move
  - Test drag validation rules and restrictions
- **Kanban Card Interactions**
  - Test card click navigation to detail page
  - Test card hover states and interactions
  - Test card action buttons and menus

### 1.2 Purchase Orders Module (`/purchase-orders`)

#### 1.2.1 Purchase Orders List Page
- **Custom Display & Functionality**
  - Test custom purchase order listing with supplier expansion
  - Test custom filtering by status, priority, supplier_id
  - Test custom search functionality
  - Test items_count display when expanded
- **Custom Actions**
  - Test custom receive button functionality
  - Test edit purchase order functionality
  - Test purchase order status management

#### 1.2.2 Purchase Order Detail Page (`/purchase-orders/[id]`)
- **Custom Business Logic**
  - Test supplier information display and integration
  - Test purchase order items management
  - Test receiving workflow integration
  - Test custom purchase order status updates

#### 1.2.3 Custom Purchase Order Workflows
- **Create Purchase Order Workflow**
  - Test createPurchaseOrderWorkflow execution
  - Test supplier validation logic
  - Test item processing and validation
- **Receive Purchase Order Workflow**
  - Test receiving process implementation
  - Test partial receiving functionality
  - Test inventory update integration

### 1.3 Suppliers Module (`/suppliers`)

#### 1.3.1 Suppliers List Page
- **Custom Supplier Management**
  - Test custom supplier listing and search
  - Test supplier creation modal (CreateSupplierModal)
  - Test supplier actions dropdown (SupplierActions)
  - Test supplier filtering and pagination

#### 1.3.2 Supplier Detail Page (`/suppliers/[id]`)
- **Custom Supplier Sections**
  - Test SupplierGeneralSection display and editing
  - Test SupplierContactSection display and editing
  - Test SupplierAddressSection display and editing
  - Test SupplierFinancialSection display and editing
  - Test SupplierBrandsSection display and editing
- **Custom Price Lists Management**
  - Test SupplierPriceListWidget functionality
  - Test price list creation and editing
  - Test PriceListUpload component (CSV/Excel import)
  - Test price list template download
  - Test price list history tracking
  - Test price list item management (add/edit/delete)
- **Custom Supplier-Product Integration**
  - Test supplier variant associations
  - Test product sourcing widget integration
  - Test supplier brand management

#### 1.3.3 Custom Price List Operations
- **Price List Import System**
  - Test CSV file upload and validation
  - Test Excel file upload and validation
  - Test import progress tracking
  - Test import error handling and reporting
  - Test price list item validation rules
- **Price List API Integration**
  - Test price list CRUD operations
  - Test price list item CRUD operations
  - Test price list history API
  - Test template generation API

### 1.4 Machines Module (`/machines`)

#### 1.4.1 Machines List Page
- **Custom Machine Management**
  - Test custom machine listing with brand integration
  - Test custom filtering (status, fuel_type, year, purchase_date)
  - Test custom search across brand, model, serial number
  - Test CreateMachineForm integration
- **Custom Display Logic**
  - Test brand name resolution and display
  - Test status badge rendering with custom colors
  - Test fuel type display and formatting
  - Test custom machine actions (edit, delete)

#### 1.4.2 Machine Detail Page (`/machines/[id]`)
- **Custom Machine Information**
  - Test custom machine details display
  - Test brand integration and display
  - Test custom machine status management
  - Test machine edit functionality (EditMachineForm)
- **Custom Integrations**
  - Test customer association display
  - Test service order history integration
  - Test warranty information display

#### 1.4.3 Custom Machine Forms
- **CreateMachineForm Testing**
  - Test form validation (required fields: brand, model, serial)
  - Test brand selection integration
  - Test custom field handling (engine_hours, horsepower, weight, etc.)
  - Test form submission and API integration
- **EditMachineForm Testing**
  - Test form pre-population with existing data
  - Test form update functionality
  - Test validation rules and error handling

### 1.5 Technicians Module (`/technicians`)

#### 1.5.1 Technicians List Page
- **Custom Technician Management**
  - Test custom technician listing
  - Test CreateTechnicianForm integration
  - Test custom search and filtering
  - Test technician actions and navigation

#### 1.5.2 Technician Detail Page (`/technicians/[id]`)
- **Custom Technician Information**
  - Test custom technician details display
  - Test EditTechnicianForm functionality
  - Test TechnicianOpenServiceOrdersWidget integration
- **Custom Service Order Integration**
  - Test assigned service orders display
  - Test service order assignment functionality
  - Test workload management integration

#### 1.5.3 Custom Technician Forms
- **CreateTechnicianForm Testing**
  - Test form validation and submission
  - Test custom field handling
  - Test brand certification management
- **EditTechnicianForm Testing**
  - Test form pre-population and updates
  - Test certification modification
  - Test validation rules

### 1.6 Invoicing Module (`/invoices`)

#### 1.6.1 Invoices List Page
- **Custom Invoice Management**
  - Test custom invoice listing
  - Test invoice search and filtering
  - Test custom invoice status management
  - Test PDF generation integration

#### 1.6.2 Invoice Detail Page (`/invoices/[id]`)
- **Custom Invoice Display**
  - Test custom invoice details rendering
  - Test line items display and formatting
  - Test customer information integration
- **Custom PDF Generation**
  - Test PDF download functionality
  - Test PDF content accuracy and formatting
  - Test PDF generation workflow

#### 1.6.3 Custom Invoice Workflows
- **Invoice Creation from Service Order**
  - Test convertServiceOrderToInvoice workflow
  - Test automatic data population from service order
  - Test labor and parts calculation
- **Invoice Creation from Order**
  - Test convertOrderToInvoice workflow
  - Test item mapping and pricing
  - Test invoice calculation accuracy
- **PDF Generation Workflow**
  - Test generateInvoicePDF workflow
  - Test PDF template rendering
  - Test error handling in PDF generation

### 1.7 Warranties Module (`/warranties`)

#### 1.7.1 Custom Warranty Management
- **Warranties List Page**
  - Test custom warranty listing
  - Test warranty search and filtering
  - Test warranty status management
- **Warranty Detail Page**
  - Test warranty details display
  - Test machine integration
  - Test warranty validation logic

### 1.8 Rentals Module (`/rentals`)

#### 1.8.1 Custom Rental Management
- **Rentals List Page**
  - Test custom rental listing
  - Test rental status filtering
  - Test rental search functionality
- **Rental Detail Page**
  - Test rental details display
  - Test customer and machine integration
  - Test rental return functionality
  - Test status update workflows

### 1.9 Brands Module (`/settings/brands`)

#### 1.9.1 Custom Brand Management
- **Brand Administration**
  - Test custom brand listing and management
  - Test brand search functionality
  - Test brand creation and editing
  - Test brand-variant associations
  - Test brand-supplier relationships
- **Brand Integration Testing**
  - Test brand selection components (BrandSelect)
  - Test variant brand management (VariantBrandManager)
  - Test brand chips display (VariantBrandChips)
  - Test product brand overview (ProductBrandOverview)

---

## 2. Custom API Endpoints Testing

### 2.1 Service Orders API
- **Custom Endpoints**
  - `GET /admin/service-orders` - Test tab filtering, search, pagination
  - `POST /admin/service-orders` - Test workflow integration and validation
  - `GET /admin/service-orders/[id]` - Test detailed service order retrieval
  - `POST /admin/service-orders/[id]/status` - Test status update functionality
  - `POST /admin/service-orders/[id]/comments` - Test comment creation
  - `PUT /admin/service-orders/[id]/comments/[comment_id]` - Test comment updates
  - `POST /admin/service-orders/[id]/items` - Test service item management
  - `POST /admin/service-orders/[id]/time-entries` - Test time tracking

### 2.2 Purchase Orders API
- **Custom Endpoints**
  - `GET /admin/purchase-orders` - Test supplier expansion and filtering
  - `POST /admin/purchase-orders` - Test creation workflow
  - `POST /admin/purchase-orders/[id]/receive` - Test receiving workflow
  - `POST /admin/purchase-orders/draft/add-item` - Test draft item management

### 2.3 Suppliers API
- **Custom Endpoints**
  - `GET /admin/suppliers` - Test supplier listing
  - `POST /admin/suppliers` - Test supplier creation
  - `GET /admin/suppliers/[id]/price-lists` - Test price list management
  - `POST /admin/suppliers/[id]/price-lists/import` - Test price list import
  - `GET /admin/suppliers/[id]/price-lists/template` - Test template generation
  - `GET /admin/suppliers/[id]/brands` - Test supplier-brand associations
  - `GET /admin/suppliers/[id]/variants` - Test supplier-variant relationships

### 2.4 Machines API
- **Custom Endpoints**
  - `GET /admin/machines` - Test machine listing with brand integration
  - `POST /admin/machines` - Test machine creation
  - `PUT /admin/machines/[id]` - Test machine updates
  - `DELETE /admin/machines/[id]` - Test machine deletion

### 2.5 Technicians API
- **Custom Endpoints**
  - `GET /admin/technicians` - Test technician listing
  - `POST /admin/technicians` - Test technician creation
  - `GET /admin/technicians/[id]/service-orders` - Test assigned orders

### 2.6 Brands API
- **Custom Endpoints**
  - `GET /admin/brands` - Test brand listing
  - `POST /admin/brands` - Test brand creation via workflow
  - `GET /admin/brands/search` - Test brand search functionality
  - `GET /admin/brands/[id]/variants` - Test brand-variant associations

### 2.7 Invoices API
- **Custom Endpoints**
  - `GET /admin/invoices` - Test invoice listing
  - `POST /admin/invoices` - Test invoice creation workflows
  - `GET /admin/invoices/[id]/pdf` - Test PDF generation
  - `GET /admin/invoices/analytics` - Test custom analytics

### 2.8 Additional Custom APIs
- **Product Integration**
  - `GET /admin/products/[id]/suppliers` - Test product-supplier associations
  - `PUT /admin/products/variants/[id]/brand` - Test variant brand assignment
- **Stock Location Details**
  - `GET /admin/stock-location-details` - Test extended location information
  - `PUT /admin/stock-location-details/[id]` - Test location details updates

---

## 3. Custom Workflow Testing

### 3.1 Service Order Workflows
- **createServiceOrderWorkflow**
  - Test workflow execution with valid data
  - Test validation steps (validateServiceOrderDataStep)
  - Test service order creation step (createServiceOrderStep)
  - Test automatic service order number generation
  - Test compensation logic on failure
  - Test workflow rollback scenarios

### 3.2 Purchase Order Workflows
- **createPurchaseOrderWorkflow**
  - Test workflow execution
  - Test supplier validation
  - Test item processing logic
  - Test error handling and compensation

### 3.3 Invoice Generation Workflows
- **createInvoiceFromOrderWorkflow**
  - Test order to invoice conversion
  - Test item mapping accuracy
  - Test price calculation logic
- **createInvoiceFromServiceOrderWorkflow**
  - Test service order to invoice conversion
  - Test labor and parts calculation
  - Test service item processing
- **generateInvoicePdfWorkflow**
  - Test PDF generation process
  - Test template rendering
  - Test error handling

### 3.4 Brand Management Workflows
- **createBrandWorkflow**
  - Test brand creation process
  - Test validation rules
  - Test duplicate handling

### 3.5 Order Enhancement Workflows
- **createOrderWithReservationsWorkflow**
  - Test inventory reservation logic
  - Test stock allocation
  - Test availability validation

---

## 4. Custom Component Testing

### 4.1 Custom Form Components
- **CreateServiceOrderForm**
  - Test form validation and submission
  - Test customer/machine/technician integration
  - Test service type and priority selection
- **EditServiceOrderForm**
  - Test form pre-population
  - Test update functionality
  - Test modal integration
- **CreateMachineForm / EditMachineForm**
  - Test machine data validation
  - Test brand integration
  - Test form submission and error handling
- **CreateTechnicianForm / EditTechnicianForm**
  - Test technician data management
  - Test certification handling
  - Test form validation rules
- **CreateSupplierModal / EditSupplierForm**
  - Test supplier data management
  - Test address and contact validation
  - Test modal and form integration

### 4.2 Custom Widget Components
- **Service Order Widgets**
  - ServiceOrderOverview - Test data display and formatting
  - ServiceOrderStatusActions - Test status change functionality
  - ServiceOrderItems - Test item management (CRUD operations)
  - ServiceOrderComments - Test comment system
  - ServiceOrderTimeEntries - Test time tracking
  - ServiceOrderStatusHistory - Test audit trail display
  - ServiceOrderCharacteristics - Test custom fields
- **Product Integration Widgets**
  - ProductSourcing - Test supplier information display
  - ProductBrandOverview - Test brand information
  - VariantBrandManager - Test brand assignment
  - VariantBrandChips - Test brand display
- **Customer Integration Widgets**
  - CustomerMachinesWidget - Test customer-machine relationships
- **Supplier Widgets**
  - SupplierDetailsWidget - Test supplier information display
  - SupplierPriceListWidget - Test price list management
- **Technician Widgets**
  - TechnicianOpenServiceOrdersWidget - Test assigned orders display
- **Order Enhancement Widgets**
  - CreateOrderWidget - Test order creation from various contexts

### 4.3 Custom Utility Components
- **ServiceTypeLabel**
  - Test service type badge rendering
  - Test color coding and styling
- **ActionMenu**
  - Test dropdown menu functionality
  - Test action button integration
- **SupplierBrandSelect**
  - Test brand selection with supplier context
  - Test validation and filtering
- **BrandSelect**
  - Test general brand selection functionality
  - Test search and filtering
- **Skeleton Components**
  - Test loading state components
  - Test skeleton animation and styling

### 4.4 Custom Layout Components
- **TwoColumnPage**
  - Test responsive layout behavior
  - Test content organization
- **RouteModalForm / RouteModalProvider**
  - Test modal routing integration
  - Test form handling within modals
- **Breadcrumb Components**
  - Test technician breadcrumb paths
  - Test dynamic breadcrumb generation

---

## 5. Custom Business Logic Testing

### 5.1 Service Order Business Rules
- **Status Transition Logic**
  - Test valid status transitions (draft → ready_for_pickup → in_progress → done)
  - Test invalid status transition prevention
  - Test returned_for_review status handling
- **Priority and Cost Calculations**
  - Test total_cost calculation from items and time entries
  - Test priority-based scheduling logic
  - Test service type-specific business rules
- **Assignment Logic**
  - Test technician assignment rules
  - Test "unassigned" state handling
  - Test workload distribution logic

### 5.2 Purchase Order Business Rules
- **Receiving Logic**
  - Test partial receiving functionality
  - Test inventory update calculations
  - Test receiving validation rules
- **Supplier Integration**
  - Test supplier product associations
  - Test price list integration
  - Test supplier-specific business rules

### 5.3 Machine Management Business Rules
- **Status Management**
  - Test machine status transitions (active, inactive, maintenance, sold)
  - Test status-based availability rules
- **Customer Association**
  - Test customer-machine relationship management
  - Test ownership transfer logic

### 5.4 Brand Management Business Rules
- **Brand-Product Associations**
  - Test brand assignment to products/variants
  - Test brand validation rules
  - Test brand hierarchy management
- **Supplier-Brand Relationships**
  - Test supplier brand certification
  - Test brand-specific supplier rules

---

## 6. Custom Integration Testing

### 6.1 Module Cross-Integration
- **Service Orders ↔ Custom Modules**
  - Test service order creation with machine assignment
  - Test service order creation with technician assignment
  - Test service order to invoice generation
- **Purchase Orders ↔ Suppliers**
  - Test purchase order creation with supplier selection
  - Test supplier price list integration
  - Test receiving workflow with inventory updates
- **Machines ↔ Customers ↔ Service Orders**
  - Test end-to-end customer machine service workflow
  - Test machine service history tracking
- **Brands ↔ Products ↔ Suppliers**
  - Test brand assignment to product variants
  - Test supplier brand certification workflow
  - Test brand-based product sourcing

### 6.2 Workflow Chain Integration
- **Service Order Complete Lifecycle**
  - Test creation → assignment → progress → completion → invoicing
  - Test status history tracking throughout lifecycle
  - Test time and cost accumulation
- **Purchase Order Complete Lifecycle**
  - Test creation → approval → receiving → inventory update
  - Test supplier communication integration
- **Invoice Generation Chains**
  - Test service order → invoice → PDF generation
  - Test order → invoice → PDF generation

---

## 7. Custom UI/UX Testing

### 7.1 Custom Styling and Branding
- **Service Order Status Colors**
  - Test status badge color coding
  - Test priority badge color coding
  - Test service type badge styling
- **Custom Form Styling**
  - Test form layout and spacing
  - Test validation error styling
  - Test success state styling
- **Custom Table Styling**
  - Test data table custom columns
  - Test action button styling
  - Test filter and search styling

### 7.2 Custom Navigation
- **Service Order Tabs**
  - Test tab switching behavior
  - Test tab state persistence
  - Test badge count updates
- **Kanban View Navigation**
  - Test view toggle functionality
  - Test kanban board navigation
  - Test card interaction states

### 7.3 Custom Responsive Behavior
- **Service Order Kanban**
  - Test kanban board on mobile devices
  - Test drag-and-drop on touch devices
- **Custom Forms**
  - Test form responsiveness across devices
  - Test modal behavior on mobile

---

## 8. Custom Performance Testing

### 8.1 Custom Data Loading
- **Service Order List Performance**
  - Test performance with large numbers of service orders
  - Test tab switching performance
  - Test search and filter performance
- **Kanban View Performance**
  - Test kanban rendering with many cards
  - Test drag-and-drop performance
  - Test real-time updates performance

### 8.2 Custom API Performance
- **Workflow Execution Performance**
  - Test service order creation workflow speed
  - Test invoice generation workflow speed
  - Test complex multi-step workflow performance
- **Custom Query Performance**
  - Test service order listing with complex filters
  - Test supplier price list queries
  - Test brand-product association queries

---

## 9. Custom Error Handling

### 9.1 Workflow Error Handling
- **Service Order Workflow Failures**
  - Test compensation logic execution
  - Test error message display
  - Test rollback functionality
- **Invoice Generation Failures**
  - Test PDF generation error handling
  - Test workflow retry mechanisms
  - Test partial failure recovery

### 9.2 Custom Validation Errors
- **Business Rule Violations**
  - Test service order status transition violations
  - Test machine assignment conflicts
  - Test technician workload violations
- **Data Integrity Errors**
  - Test supplier-product relationship validation
  - Test brand assignment validation
  - Test price list data validation

---

## 10. Custom Security Testing

### 10.1 Custom Module Access Control
- **Service Order Access**
  - Test technician access to assigned orders only
  - Test customer access restrictions
  - Test administrative override capabilities
- **Supplier Data Access**
  - Test supplier information access controls
  - Test price list confidentiality
  - Test financial data protection

### 10.2 Custom API Security
- **Workflow Security**
  - Test workflow execution authorization
  - Test step-level access controls
  - Test compensation action authorization
- **Custom Endpoint Security**
  - Test custom API endpoint authorization
  - Test data filtering based on user roles
  - Test sensitive data masking

---

## 11. Test Data Requirements for Custom Modules

### 11.1 Custom Master Data
- **Service Orders Test Data**
  - Create service orders in all custom statuses
  - Include orders with various service types and priorities
  - Include orders with different technician assignments
- **Custom Supplier Data**
  - Create suppliers with complete price lists
  - Include suppliers with brand certifications
  - Include suppliers with various financial terms
- **Machine Test Data**
  - Create machines with different brands and specifications
  - Include machines in various status states
  - Include machines with service history

### 11.2 Custom Relationship Data
- **Brand Associations**
  - Create brand-product variant relationships
  - Create supplier-brand certifications
  - Create technician brand qualifications
- **Complex Service Scenarios**
  - Create multi-technician service orders
  - Create service orders with extensive item lists
  - Create service orders with long time tracking history

---

## 12. Success Criteria for Custom Functionality

### 12.1 Custom Workflow Success
- All custom workflows execute without errors
- Compensation logic works correctly on failures
- Workflow performance meets business requirements

### 12.2 Custom Integration Success
- All module integrations function correctly
- Data consistency maintained across modules
- Custom business rules enforced properly

### 12.3 Custom UI/UX Success
- All custom components render correctly
- Custom styling applied consistently
- User workflows intuitive and efficient

---

## Test Execution Priority

### Phase 1: Core Custom Functionality
1. Service Order creation and management
2. Purchase Order workflows
3. Supplier and price list management
4. Machine and technician management

### Phase 2: Advanced Features
1. Invoice generation workflows
2. Kanban view functionality
3. Advanced filtering and search
4. Complex integrations

### Phase 3: Edge Cases and Performance
1. Workflow error handling
2. Performance with large datasets
3. Complex business rule validation
4. Security and access control

This focused testing plan ensures thorough validation of all custom functionality while avoiding redundant testing of proven MedusaJS core features.