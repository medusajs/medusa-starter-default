AI-Powered Code Review Report: Service Orders Module

  Executive Summary

  Overall Assessment: GOOD - The service orders module demonstrates solid MedusaJS patterns with        
  good architecture, but has several areas requiring attention for production readiness.

  Severity Breakdown:
  - CRITICAL: 2 issues
  - HIGH: 4 issues
  - MEDIUM: 6 issues
  - LOW: 3 issues

  ---
  Critical Issues

  1. Race Condition in Service Order Number Generation

  File: src/modules/service-orders/service.ts:60-67Severity: CRITICALCategory: Concurrency/Data
  IntegrityCWE: CWE-362 (Concurrent Execution using Shared Resource with Improper Synchronization)      

  Issue:
  The generateServiceOrderNumber() method has a race condition that can cause duplicate service
  order numbers when multiple orders are created simultaneously.

  async generateServiceOrderNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const orders = await this.listServiceOrders({})
    const yearlyOrders = orders.filter(order =>
      order.service_order_number?.startsWith(`SO-${year}`)
    )
    return `SO-${year}-${String(yearlyOrders.length + 1).padStart(3, '0')}`
  }

  Attack Scenario: Two concurrent requests read the same count, both generate "SO-2025-042",
  violating the unique constraint and causing one request to fail.

  Fix:
  async generateServiceOrderNumber(): Promise<string> {
    const year = new Date().getFullYear()

    // Use database-level atomic operation
    const result = await this.manager.query(`
      SELECT COALESCE(MAX(CAST(
        SUBSTRING(service_order_number FROM 'SO-[0-9]+-([0-9]+)') AS INTEGER
      )), 0) + 1 as next_number
      FROM service_order
      WHERE service_order_number LIKE $1
    `, [`SO-${year}-%`])

    const nextNumber = result[0].next_number
    return `SO-${year}-${String(nextNumber).padStart(3, '0')}`
  }

  Effort: MediumAuto-fixable: No

  ---
  2. SQL Injection via Unvalidated Query Parameters

  File: src/api/admin/service-orders/route.ts:56-62Severity: CRITICALCategory: SecurityCWE: CWE-89      
  (SQL Injection)

  Issue:
  The search query q parameter is directly interpolated into ILIKE clauses without proper
  sanitization.

  if (q) {
    filters.$or = [
      { service_order_number: { $ilike: `%${q}%` } },
      { description: { $ilike: `%${q}%` } },
      { customer_complaint: { $ilike: `%${q}%` } },
    ]
  }

  Attack Vector: Input like %' OR '1'='1 could bypass filters or expose sensitive data.

  Fix:
  if (q) {
    // MedusaJS/MikroORM should escape parameters, but validate input first
    const sanitizedQuery = String(q).replace(/[%_]/g, '\\$&').trim()

    if (sanitizedQuery.length === 0 || sanitizedQuery.length > 100) {
      return res.status(400).json({ error: "Invalid search query" })
    }

    filters.$or = [
      { service_order_number: { $ilike: `%${sanitizedQuery}%` } },
      { description: { $ilike: `%${sanitizedQuery}%` } },
      { customer_complaint: { $ilike: `%${sanitizedQuery}%` } },
    ]
  }

  Effort: EasyAuto-fixable: Yes

  ---
  High Severity Issues

  3. N+1 Query Problem in List Operations

  File: src/modules/service-orders/service.ts:327-354Severity: HIGHCategory: Performance

  Issue:
  The updateServiceOrderTotals() method is called after every item/time entry operation, causing        
  multiple database round-trips. When bulk operations occur, this creates an N+1 query pattern.

  async addServiceOrderItem(serviceOrderId: string, itemData: CreateServiceOrderItemInput) {
    const item = await this.createServiceOrderItems({...})
    await this.updateServiceOrderTotals(serviceOrderId) // Separate query
    return item
  }

  Performance Impact: Adding 10 parts = 30+ queries (10 inserts + 10 list queries + 10 updates).        

  Fix:
  // Add batch operation methods
  async addServiceOrderItems(serviceOrderId: string, items: CreateServiceOrderItemInput[]) {
    const createdItems = await Promise.all(
      items.map(item => this.createServiceOrderItems({
        ...item,
        service_order_id: serviceOrderId,
        total_price: item.quantity_needed * item.unit_price,
        status: "pending",
      }))
    )

    // Single totals update after batch
    await this.updateServiceOrderTotals(serviceOrderId)
    return createdItems
  }

  Effort: MediumReferences: https://docs.medusajs.com

  ---
  4. Missing Authorization Checks in API Routes

  File: src/api/admin/service-orders/[id]/route.ts:31-57Severity: HIGHCategory: SecurityCWE: CWE-862    
   (Missing Authorization)

  Issue:
  No authorization checks verify if the authenticated user has permission to update/delete service      
  orders.

  export async function PUT(req: MedusaRequest, res: MedusaResponse) {
    const { id } = req.params
    // No check if user can modify this service order
    const updatedServiceOrders = await serviceOrdersService.updateServiceOrders({...})
  }

  Attack Scenario: Any authenticated user can modify any service order, including financial data.       

  Fix:
  export async function PUT(req: MedusaRequest, res: MedusaResponse) {
    try {
      const { id } = req.params
      const user = req.auth_context?.actor_id // Get authenticated user

      if (!user) {
        return res.status(401).json({ error: "Unauthorized" })
      }

      // Check permissions (implement based on your RBAC system)
      const hasPermission = await checkPermission(user, 'service_orders', 'update')
      if (!hasPermission) {
        return res.status(403).json({ error: "Forbidden" })
      }

      const updatedServiceOrders = await serviceOrdersService.updateServiceOrders({...})
      //...
    }
  }

  Effort: MediumCVSS: 7.5

  ---
  5. Memory Leak in Event Logger

  File: src/modules/service-orders/helpers/event-logger.ts:19-20Severity: HIGHCategory:
  Performance/Reliability

  Issue:
  Static Maps storing pending events never get cleaned up if flushGroupedEvents() fails or if events    
   are never flushed due to timer issues.

  private static pendingEvents: Map<string, Array<EventLogInput & { timestamp: Date }>> = new Map()     
  private static flushTimers: Map<string, NodeJS.Timeout> = new Map()

  Impact: Long-running servers accumulate unbounded data causing memory exhaustion.

  Fix:
  // Add cleanup mechanism
  private static readonly MAX_PENDING_AGE_MS = 3600000 // 1 hour

  static async periodicCleanup() {
    const now = Date.now()

    for (const [groupKey, events] of this.pendingEvents.entries()) {
      const oldestEvent = events[0]
      if (oldestEvent && now - oldestEvent.timestamp.getTime() > this.MAX_PENDING_AGE_MS) {
        console.warn(`Cleaning up stale events for ${groupKey}`)
        this.pendingEvents.delete(groupKey)

        const timer = this.flushTimers.get(groupKey)
        if (timer) {
          clearTimeout(timer)
          this.flushTimers.delete(groupKey)
        }
      }
    }
  }

  // Call from module initialization
  static initializeCleanup() {
    setInterval(() => this.periodicCleanup(), 300000) // Every 5 minutes
  }

  Effort: Easy

  ---
  6. Inefficient Manual Pagination

  File: src/api/admin/service-orders/route.ts:65-73Severity: HIGHCategory: Performance

  Issue:
  Fetching all records then applying client-side pagination is extremely inefficient and will cause     
  performance issues as data grows.

  const serviceOrders = await serviceOrdersService.listServiceOrdersWithLinks(filters)
  const paginatedOrders = serviceOrders.slice(Number(offset), Number(offset) + Number(limit))

  Impact: 10,000 service orders = loading all 10K records into memory to return 50.

  Fix:
  // Use MedusaJS pagination properly
  const config = {
    skip: Number(offset),
    take: Number(limit),
    relations: ["customer", "machine", "technician"], // If using Query API
  }

  const [serviceOrders, count] = await serviceOrdersService.listAndCountServiceOrders(
    filters,
    config
  )

  res.json({
    service_orders: serviceOrders,
    count,
    offset: Number(offset),
    limit: Number(limit)
  })

  Effort: Easy

  ---
  Medium Severity Issues

  7. Unsafe Type Casting with any

  Files: Multiple (service.ts:8, 48, route.ts:8, 33, etc.)Severity: MEDIUMCategory:
  Maintainability/Type Safety

  Issue:
  Extensive use of any type defeats TypeScript's type checking and can hide bugs.

  const serviceOrdersService: any = req.scope.resolve(SERVICE_ORDERS_MODULE)

  Fix:
  // Define proper types
  import { ServiceOrdersService } from "../../../modules/service-orders"

  const serviceOrdersService = req.scope.resolve<ServiceOrdersService>(SERVICE_ORDERS_MODULE)

  Effort: Easy

  ---
  8. Missing Input Validation in Service Methods

  File: src/modules/service-orders/service.ts:151-175Severity: MEDIUMCategory: Data Integrity

  Issue:
  No validation for negative quantities, prices, or invalid dates.

  async addServiceOrderItem(serviceOrderId: string, itemData: CreateServiceOrderItemInput) {
    // No validation if quantity_needed < 0 or unit_price < 0
    const item = await this.createServiceOrderItems({...})
  }

  Fix:
  async addServiceOrderItem(serviceOrderId: string, itemData: CreateServiceOrderItemInput) {
    // Validate inputs
    if (itemData.quantity_needed <= 0) {
      throw new Error("Quantity must be positive")
    }

    if (itemData.unit_price < 0) {
      throw new Error("Unit price cannot be negative")
    }

    if (!itemData.title?.trim()) {
      throw new Error("Item title is required")
    }

    const item = await this.createServiceOrderItems({...})
    //...
  }

  Effort: Easy

  ---
  9. Inconsistent Error Handling

  Files: src/api/admin/service-orders/route.ts (multiple locations)Severity: MEDIUMCategory:
  Maintainability

  Issue:
  Some routes log errors, others don't. No structured error responses.

  Fix:
  // Create centralized error handler
  class ServiceOrderError extends Error {
    constructor(
      message: string,
      public statusCode: number = 500,
      public code: string = 'INTERNAL_ERROR'
    ) {
      super(message)
    }
  }

  // Use in routes
  export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
      //...
    } catch (error) {
      const err = error instanceof ServiceOrderError ? error : new ServiceOrderError(
        error instanceof Error ? error.message : "Unknown error"
      )

      console.error("Service orders list error:", {
        code: err.code,
        message: err.message,
        stack: err.stack
      })

      res.status(err.statusCode).json({
        error: err.message,
        code: err.code
      })
    }
  }

  Effort: Medium

  ---
  10. Workflow Type Mismatch

  File: src/workflows/service-orders/create-service-order-workflow.ts:5-16Severity: MEDIUMCategory:     
  Type Safety

  Issue:
  Workflow input type doesn't match actual service order creation requirements (missing customer_id,    
   machine_id).

  export interface CreateServiceOrderInput {
    description: string
    service_type?: "normal" | "warranty" | "setup" | "emergency" | "preventive"
    // Missing customer_id, machine_id, technician_id
  }

  Fix:
  export interface CreateServiceOrderInput {
    description: string
    customer_id: string
    machine_id: string
    technician_id?: string | null
    service_type?: "insurance" | "warranty" | "internal" | "standard" | "sales_prep" | "quote"
    priority?: "low" | "normal" | "high" | "urgent"
    //... other fields matching the model
  }

  Effort: Easy

  ---
  11. Missing Indexes on Foreign Keys

  File: src/modules/service-orders/models/service-order.ts:37-39Severity: MEDIUMCategory:
  Performance

  Issue:
  No explicit indexes on customer_id, machine_id, technician_id foreign key fields used in
  filtering.

  Fix:
  const ServiceOrder = model.define("service_order", {
    id: model.id().primaryKey(),
    service_order_number: model.text().unique().index(),

    customer_id: model.text().nullable().index(), // Add index
    machine_id: model.text().nullable().index(), // Add index
    technician_id: model.text().nullable().index(), // Add index

    status: model.enum(ServiceOrderStatus).default(ServiceOrderStatus.DRAFT).index(), // Add index      
    //...
  })

  Effort: Trivial

  ---
  12. Unhandled Promise Rejection in Event Logging

  File: src/modules/service-orders/service.ts:163-172Severity: MEDIUMCategory: Reliability

  Issue:
  Event logging errors are caught but subsequent async operations might fail silently.

  try {
    const eventTemplate = ServiceOrderEventLogger.EventTemplates.partAdded(item)
    await ServiceOrderEventLogger.logEvent({...}, this, ...)
  } catch (eventError) {
    console.error("Failed to log part added event:", eventError)
    // Continues without indication of failure
  }

  Fix:
  Implement monitoring/alerting for event logging failures:
  import { logger } from "@medusajs/framework/logger"

  try {
    await ServiceOrderEventLogger.logEvent({...})
  } catch (eventError) {
    logger.error("Event logging failed", {
      eventType: 'part_added',
      serviceOrderId,
      error: eventError
    })
    // Could also emit to monitoring service (Sentry, DataDog, etc.)
  }

  Effort: Easy

  ---
  Low Severity Issues

  13. Excessive Console Logging in Production

  Files: Multiple (route.ts:22, 36, service.ts:158, etc.)Severity: LOWCategory: Maintainability

  Issue:
  Debug console.log statements left in production code.

  Fix:
  import { logger } from "@medusajs/framework/logger"

  // Replace console.log with proper logging
  logger.debug('Service Orders API called with:', { tab, status, limit, offset })

  Effort: Trivial

  ---
  14. Incomplete DTO Definitions

  File: src/modules/service-orders/types/index.tsSeverity: LOWCategory: Type Safety

  Issue:
  DTOs don't include validation decorators or runtime validation.

  Fix:
  Consider using validation libraries:
  import { IsString, IsNumber, Min, IsOptional } from "class-validator"

  export class CreateServiceOrderItemDTO {
    @IsString()
    title: string

    @IsNumber()
    @Min(1)
    quantity_needed: number

    @IsNumber()
    @Min(0)
    unit_price: number

    @IsOptional()
    @IsString()
    description?: string
  }

  Effort: Medium

  ---
  15. TODO Comments Indicate Incomplete Implementation

  File: src/modules/service-orders/service.ts:366, 377, 475Severity: LOWCategory: Completeness

  Issue:
  Three TODO comments indicate missing MedusaJS Query API integration for linked data.

  Recommendation: Prioritize implementing proper module linking using MedusaJS Query API before
  production deployment.

  Effort: Medium

  ---
  MedusaJS Best Practices Compliance

  ✅ Strengths

  1. Proper Module Structure: Follows MedusaJS module pattern with Module() export
  2. Model Definitions: Uses model.define() correctly with proper field types
  3. Service Inheritance: Extends MedusaService appropriately
  4. Workflow Pattern: Implements workflows with compensation logic
  5. Module Links: Properly defined links to Customer, Machine, Technician modules
  6. Status History: Good audit trail implementation

  ⚠️ Areas for Improvement

  1. Query API Usage: Not leveraging MedusaJS Query API for linked data retrieval
  2. Pagination: Manual pagination instead of framework-provided methods
  3. Transactions: No explicit transaction management in multi-step operations
  4. Events: Not emitting MedusaJS events for state changes (should use EventBus)
  5. Subscribers: Missing event subscribers for cross-module reactions

  ---
  Architecture Review

  Positive Patterns

  - Clear separation between models, service, workflows, and API routes
  - Status history tracking for audit compliance
  - Comment system with threading support
  - Time tracking with billable/non-billable distinction
  - Event logging helper for activity feeds

  Concerns

  1. Service Layer Coupling: ServiceOrderEventLogger directly depends on service instance
  2. Business Logic in Routes: Some validation logic in API routes should be in service layer
  3. Missing Domain Events: Should emit events for external systems to react to

  ---
  Security Review Summary

  | Category                  | Findings | Risk Level |
  |---------------------------|----------|------------|
  | Injection Vulnerabilities | 1        | CRITICAL   |
  | Authorization             | 1        | HIGH       |
  | Data Validation           | 2        | MEDIUM     |
  | Concurrency               | 1        | CRITICAL   |
  | Total                     | 5        | -          |

  ---
  Performance Review Summary

  | Issue             | Impact | Complexity to Fix |
  |-------------------|--------|-------------------|
  | N+1 Queries       | HIGH   | Medium            |
  | Memory Leak       | HIGH   | Easy              |
  | Manual Pagination | HIGH   | Easy              |
  | Missing Indexes   | MEDIUM | Trivial           |
  | Total Issues      | 4      | -                 |

  ---
  Recommendations

  Immediate Actions (Critical/High)

  1. Fix race condition in service order number generation (Issue #1)
  2. Add input sanitization for search queries (Issue #2)
  3. Implement batch operations to reduce N+1 queries (Issue #3)
  4. Add authorization middleware to all routes (Issue #4)
  5. Fix memory leak in event logger with periodic cleanup (Issue #5)
  6. Implement proper pagination (Issue #6)

  Short-term Improvements (Medium)

  7. Replace any types with proper type definitions
  8. Add comprehensive input validation
  9. Standardize error handling across routes
  10. Fix workflow type definitions
  11. Add database indexes on foreign keys
  12. Implement proper logging with MedusaJS logger

  Long-term Enhancements (Low)

  13. Complete MedusaJS Query API integration (resolve TODOs)
  14. Add runtime validation with decorators
  15. Implement MedusaJS EventBus for domain events
  16. Add integration tests for workflows
  17. Implement role-based access control (RBAC)

  ---
  Test Coverage Recommendations

  Priority Test Cases:
  1. Concurrent service order creation (race condition test)
  2. SQL injection attempts in search
  3. Authorization bypass attempts
  4. Bulk operations performance benchmarks
  5. Event logger memory usage over time
  6. Pagination edge cases

  ---
  Conclusion

  The service orders module demonstrates solid understanding of MedusaJS patterns but requires
  security hardening and performance optimization before production deployment. The critical issues     
  around race conditions and SQL injection must be addressed immediately. The architecture is
  generally sound, but tighter integration with MedusaJS framework features (Query API, EventBus,       
  proper pagination) will improve maintainability and scalability.

  Estimated Effort to Address All Issues:
  - Critical/High: 3-5 days
  - Medium: 2-3 days
  - Low: 1-2 days
  - Total: 6-10 days