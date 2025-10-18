# Large File Price List Upload - Implementation Plan

**Issue**: Current price list upload implementation cannot handle files with 100,000+ lines efficiently.

**Status**: Planning Phase
**Priority**: High
**Complexity**: Medium-High

---

## Table of Contents
1. [Current Implementation Analysis](#current-implementation-analysis)
2. [MedusaJS Native Patterns Research](#medusajs-native-patterns-research)
3. [Identified Problems](#identified-problems)
4. [Proposed Solution](#proposed-solution)
5. [Implementation Phases](#implementation-phases)
6. [Technical Details](#technical-details)
7. [Testing Strategy](#testing-strategy)
8. [Rollout Plan](#rollout-plan)

---

## Current Implementation Analysis

### Current Upload Flow
Located in: `src/admin/routes/suppliers/[id]/price-lists/import/route.ts`

```typescript
// Client-side (supplier-price-lists.tsx:382)
const content = await file.text()  // ❌ Entire file loaded in browser memory

// Workflow (upload-price-list.ts)
- Parse entire file in memory
- Process all rows synchronously
- No batching of database operations
- No progress tracking
```

### Performance Issues with Large Files

#### 1. **Client-Side Memory Overload**
- `file.text()` loads entire file into browser memory
- 100,000 lines @ ~150 bytes/line = ~15MB+ in memory
- Blocks UI thread during file reading
- Risk of browser tab crashes

#### 2. **Server-Side In-Memory Processing**
```typescript
// parse-fixed-width-price-list.ts:74
const lines = file_content.split('\n')  // ❌ All lines in memory

// Lines 123-280: Synchronous loop processing
for (let i = 0; i < dataLines.length; i++) {
  // Individual database queries per line ❌
  const variants = await productModuleService.listProductVariants(...)
}
```

**Problems**:
- All 100,000+ lines held in memory simultaneously
- Synchronous loop = no concurrent processing
- 100,000+ sequential database queries
- No request timeout handling

#### 3. **Database Performance**
```typescript
// service.ts:218-231 - processPriceListItems
const processedItems = items.map(item => ({...}))
return await this.createSupplierPriceListItems(processedItems)
```

**Problems**:
- No batching of inserts
- Product lookups not cached
- N+1 query problem for product/variant resolution

#### 4. **No User Feedback**
- No progress indicator
- No streaming/chunking
- User has no idea if upload is progressing or stuck
- Request could timeout silently

---

## MedusaJS Native Patterns Research

### Product Import Workflow Analysis

MedusaJS has a **mature product import system** that handles large CSV files. Located in:
- `packages/core/core-flows/src/product/workflows/import-products.ts`
- `packages/medusa/src/api/admin/products/import/route.ts`

#### Key Patterns Found

##### 1. **Multer for File Upload** ✅
```typescript
// packages/medusa/src/api/admin/products/middlewares.ts:38
const upload = multer({ storage: multer.memoryStorage() })

// Line 103
middlewares: [upload.single("file")]
```

**Benefit**: Express middleware designed for file uploads
- Handles multipart/form-data
- Streaming support
- Buffer management
- Native to Node.js ecosystem

##### 2. **Async Workflow Execution** ✅
```typescript
// packages/core/core-flows/src/product/workflows/import-products.ts:124
batchProductsWorkflow
  .runAsStep({ input: batchRequest })
  .config({ async: true, backgroundExecution: true })
```

**Benefit**: Long-running operations don't block HTTP response
- Returns transaction ID immediately
- Workflow continues in background
- User can check status separately

##### 3. **Wait/Confirm Pattern** ✅
```typescript
// Line 102
waitConfirmationProductImportStep()

// Confirmation endpoint: import/[transaction_id]/confirm/route.ts
await workflowEngineService.setStepSuccess({
  idempotencyKey: {
    action: TransactionHandlerType.INVOKE,
    transactionId,
    stepId: waitConfirmationProductImportStepId,
    workflowId: importProductsWorkflowId,
  },
  stepResponse: new StepResponse(true),
})
```

**Benefit**: Two-phase import
1. Parse & validate file → show preview
2. User confirms → actual import executes
- Prevents accidental data overwrites
- Allows preview before committing

##### 4. **CSV Normalization Step** ✅
```typescript
// packages/core/core-flows/src/product/steps/normalize-products.ts:23
const csvProducts = convertCsvToJson<Record<string, number | string | boolean>>(fileContent)
const normalizer = new CSVNormalizer(
  csvProducts.map((row, index) => CSVNormalizer.preProcess(row, index + 1))
)
const products = normalizer.proccess()
```

**Benefit**: Structured parsing with validation
- Built-in CSV utilities
- Row-by-row preprocessing
- Error accumulation
- Standardized format

##### 5. **Batch Processing** ✅
```typescript
// packages/core/core-flows/src/product/workflows/batch-products.ts:100
const res = parallelize(
  conditionallyCreateProducts(input),
  conditionallyUpdateProducts(input),
  conditionallyDeleteProducts(input)
)
```

**Benefit**: Parallel execution where possible
- Multiple operations concurrently
- Optimized throughput
- MedusaJS native pattern

##### 6. **File Module for Temporary Storage** ✅
```typescript
// packages/core/core-flows/src/product/steps/process-import-chunks.ts:20-24
const file = container.resolve(Modules.FILE)
const contents = await file.getAsBuffer(chunk.id)
let products = JSON.parse(contents.toString("utf-8"))
await batchProductsWorkflow(container).run({ input: products })
```

**Benefit**: Chunk-based processing
- Store chunks in file system
- Process incrementally
- Memory-efficient for huge files

##### 7. **Notification System** ✅
```typescript
// import-products.ts:126-139
const notifications = transform({ input }, (data) => {
  return [{
    to: "",
    channel: "feed",
    template: "admin-ui",
    data: {
      title: "Product import",
      description: `Product import of file ${data.input.filename} completed successfully!`,
    },
  }]
})
sendNotificationsStep(notifications)
```

**Benefit**: User feedback
- Success/failure notifications
- Admin UI feed integration
- Automatic user updates

##### 8. **Body Parser Size Limits** ✅
```typescript
// packages/medusa/src/utils/middlewares/index.ts:4
export const DEFAULT_BATCH_ENDPOINTS_SIZE_LIMIT = "2mb"

// Usage in middlewares.ts:77-79
bodyParser: {
  sizeLimit: DEFAULT_BATCH_ENDPOINTS_SIZE_LIMIT,
}
```

**Benefit**: Configurable request size
- Route-specific limits
- Prevents server overload
- Can be increased per endpoint

---

## Identified Problems

### Problem Matrix

| Issue | Current State | Impact | Severity |
|-------|--------------|--------|----------|
| Client-side file reading | `file.text()` in browser | Memory overflow, UI blocking | 🔴 Critical |
| In-memory processing | All rows in array | Server memory issues | 🔴 Critical |
| Sequential DB queries | 100K+ individual queries | Extremely slow (hours) | 🔴 Critical |
| No batching | Single massive insert | Locks, timeouts | 🔴 Critical |
| No progress tracking | Silent processing | Poor UX | 🟡 High |
| No timeout handling | Request may hang | Production failures | 🟡 High |
| Body parser limits | Default 100kb | Upload rejected | 🟡 High |
| No product lookup caching | Repeated queries | Inefficient | 🟢 Medium |

---

## Proposed Solution

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React)                            │
│  1. Upload file via FormData (Multer)                       │
│  2. Receive transaction_id                                   │
│  3. Show preview with validation results                     │
│  4. User confirms import                                     │
│  5. Poll for status / receive notifications                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              API ROUTE (Import Endpoint)                     │
│  • Use Multer middleware for file upload                    │
│  • Increase body parser size limit (10mb)                   │
│  • Return 202 Accepted with transaction_id                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│        WORKFLOW (Async Background Execution)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Step 1: Parse & Validate (Streaming)                 │   │
│  │  • Use streaming CSV parser                          │   │
│  │  • Validate rows incrementally                       │   │
│  │  • Build preview (first 100 rows)                    │   │
│  │  • Accumulate errors/warnings                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Step 2: Wait for Confirmation                        │   │
│  │  • waitConfirmationPriceListImportStep()             │   │
│  │  • Pauses workflow until user confirms               │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Step 3: Batch Process Items                          │   │
│  │  • Process in chunks of 500-1000 rows                │   │
│  │  • Cache product/variant lookups                     │   │
│  │  • Bulk database inserts per batch                   │   │
│  │  • Update progress status                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Step 4: Send Notification                            │   │
│  │  • Success/failure notification                      │   │
│  │  • Admin feed update                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Set up infrastructure for async processing

#### Tasks
- [ ] **1.1**: Create middleware configuration for price list import
  - Add Multer middleware
  - Increase body parser size limit to 10mb
  - Location: `src/api/admin/suppliers/[id]/price-lists/import/middlewares.ts`

- [ ] **1.2**: Create wait confirmation step
  - `src/modules/purchasing/steps/wait-confirmation-price-list-import.ts`
  - Follow pattern from `waitConfirmationProductImportStep`

- [ ] **1.3**: Create confirmation endpoint
  - `src/api/admin/suppliers/[id]/price-lists/import/[transaction_id]/confirm/route.ts`
  - Use workflow engine to resume workflow

- [ ] **1.4**: Update client to use FormData
  - Modify `supplier-price-lists.tsx` to upload file via multipart
  - Handle transaction_id response
  - Show preview before confirmation

**Deliverables**:
- Multer-based file upload working
- Two-phase import flow (preview → confirm)
- No processing changes yet (still in-memory)

---

### Phase 2: Streaming Parser (Week 2)
**Goal**: Replace in-memory parsing with streaming

#### Tasks
- [ ] **2.1**: Install streaming CSV parser
  ```bash
  npm install csv-parser papaparse
  npm install -D @types/papaparse
  ```

- [ ] **2.2**: Create streaming parse step
  - `src/modules/purchasing/steps/parse-price-list-streaming.ts`
  - Use `papaparse` with `stream: true`
  - Process rows incrementally
  - Build preview (first 100 rows)
  - Collect errors/warnings

- [ ] **2.3**: Implement row validation
  - Validate required fields per row
  - Check data types
  - Accumulate errors without stopping
  - Max 1000 errors before aborting

- [ ] **2.4**: Update workflow to use streaming parser
  - Replace `parseCsvPriceListStep` with streaming version
  - Maintain backward compatibility with fixed-width parser

**Deliverables**:
- Memory-efficient file parsing
- Incremental validation
- Preview generation without loading full file

---

### Phase 3: Batch Processing (Week 3)
**Goal**: Implement chunked database operations

#### Tasks
- [ ] **3.1**: Create batch processing step
  - `src/modules/purchasing/steps/process-price-list-batch.ts`
  - Process items in chunks of 500-1000
  - Bulk insert per batch
  - Error handling per batch (continue on batch failure)

- [ ] **3.2**: Implement product lookup cache
  - Cache variant/product queries within workflow context
  - Use Map<sku, variant_id> for quick lookups
  - Reduce database queries by 90%+

- [ ] **3.3**: Add batch insert method to service
  - `src/modules/purchasing/service.ts`
  - `batchCreatePriceListItems(items: PriceListItem[], batchSize: number)`
  - Use database-level bulk inserts

- [ ] **3.4**: Implement progress tracking
  - Store progress in workflow state
  - Allow polling via API endpoint
  - Emit events for real-time updates

**Deliverables**:
- 100K rows processed in minutes instead of hours
- Efficient database usage
- Progress visibility

---

### Phase 4: User Experience (Week 4)
**Goal**: Polish UX for large imports

#### Tasks
- [ ] **4.1**: Add progress indicator UI
  - Show upload progress
  - Display validation progress
  - Show import progress with percentage
  - Real-time error/warning count

- [ ] **4.2**: Implement notification system
  - Success notification with summary
  - Failure notification with error link
  - Use MedusaJS notification module

- [ ] **4.3**: Add import history view
  - List past imports with status
  - Show import details (rows processed, errors, etc.)
  - Allow re-import or rollback

- [ ] **4.4**: Add status polling
  - Poll transaction status every 2 seconds
  - Show estimated time remaining
  - Handle workflow failures gracefully

**Deliverables**:
- Professional import experience
- Clear feedback throughout process
- Import audit trail

---

### Phase 5: Optimization & Edge Cases (Week 5)
**Goal**: Handle edge cases and optimize performance

#### Tasks
- [ ] **5.1**: Implement retry logic
  - Retry failed batches up to 3 times
  - Exponential backoff
  - Mark permanently failed items

- [ ] **5.2**: Add memory management
  - Stream large files to temp storage if > 20MB
  - Use file chunking for huge files
  - Automatic cleanup of temp files

- [ ] **5.3**: Performance tuning
  - Optimize batch size based on row complexity
  - Parallel batch processing (if safe)
  - Database query optimization

- [ ] **5.4**: Add admin configuration
  - Configurable batch size
  - Configurable max file size
  - Timeout settings

**Deliverables**:
- Robust error handling
- Optimized for various file sizes
- Configurable behavior

---

## Technical Details

### New Files to Create

```
src/
├── api/
│   └── admin/
│       └── suppliers/
│           └── [id]/
│               └── price-lists/
│                   └── import/
│                       ├── middlewares.ts               [NEW]
│                       └── [transaction_id]/
│                           ├── confirm/
│                           │   └── route.ts             [NEW]
│                           └── status/
│                               └── route.ts             [NEW]
└── modules/
    └── purchasing/
        ├── steps/
        │   ├── wait-confirmation-price-list-import.ts  [NEW]
        │   ├── parse-price-list-streaming.ts           [NEW]
        │   └── process-price-list-batch.ts             [NEW]
        └── workflows/
            └── upload-price-list-async.ts              [NEW]
```

### Updated Files

```
src/
├── admin/
│   └── components/
│       └── supplier-price-lists.tsx                    [MODIFIED]
├── modules/
│   └── purchasing/
│       └── service.ts                                  [MODIFIED]
```

### Key Code Patterns

#### 1. Multer Middleware
```typescript
// src/api/admin/suppliers/[id]/price-lists/import/middlewares.ts
import multer from "multer"
import { MiddlewareRoute } from "@medusajs/framework/http"

const upload = multer({ storage: multer.memoryStorage() })

export const priceListImportMiddlewares: MiddlewareRoute[] = [
  {
    method: ["POST"],
    matcher: "/admin/suppliers/:id/price-lists/import",
    bodyParser: {
      sizeLimit: "10mb",  // Increased from default
    },
    middlewares: [upload.single("file")],
  },
]
```

#### 2. Streaming CSV Parser
```typescript
// src/modules/purchasing/steps/parse-price-list-streaming.ts
import Papa from 'papaparse'
import { createStep, StepResponse } from "@medusajs/workflows-sdk"

export const parsePriceListStreamingStep = createStep(
  "parse-price-list-streaming",
  async (input: { file_buffer: Buffer, supplier_id: string }) => {
    const items: ParsedPriceListItem[] = []
    const errors: string[] = []
    const preview: ParsedPriceListItem[] = []
    let rowCount = 0

    return new Promise((resolve, reject) => {
      Papa.parse(input.file_buffer.toString('utf-8'), {
        header: true,
        step: (row, parser) => {
          rowCount++

          // Build preview (first 100 rows)
          if (preview.length < 100) {
            preview.push(processRow(row.data))
          }

          // Validate row
          const validation = validateRow(row.data, rowCount)
          if (!validation.valid) {
            errors.push(...validation.errors)
            if (errors.length > 1000) {
              parser.abort()
              reject(new Error('Too many errors'))
            }
            return
          }

          items.push(processRow(row.data))
        },
        complete: () => {
          resolve(new StepResponse({
            items,
            preview,
            errors,
            total_rows: rowCount,
          }))
        },
        error: (error) => {
          reject(error)
        },
      })
    })
  }
)
```

#### 3. Batch Processing with Cache
```typescript
// src/modules/purchasing/steps/process-price-list-batch.ts
import { createStep, StepResponse } from "@medusajs/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

const BATCH_SIZE = 1000

export const processPriceListBatchStep = createStep(
  "process-price-list-batch",
  async (input: { items: ParsedPriceListItem[], price_list_id: string }, { container }) => {
    const productModuleService = container.resolve(Modules.PRODUCT)
    const purchasingService = container.resolve("purchasingService")

    // Build lookup cache upfront
    const uniqueSkus = [...new Set(input.items.map(i => i.variant_sku).filter(Boolean))]
    const skuCache = new Map<string, string>() // sku -> variant_id

    // Batch query for all SKUs
    const variants = await productModuleService.listProductVariants(
      { sku: { $in: uniqueSkus } },
      { select: ["id", "sku"] }
    )

    variants.forEach(v => {
      if (v.sku) skuCache.set(v.sku, v.id)
    })

    // Process in batches
    const batches = []
    for (let i = 0; i < input.items.length; i += BATCH_SIZE) {
      batches.push(input.items.slice(i, i + BATCH_SIZE))
    }

    let processed = 0
    const failed = []

    for (const batch of batches) {
      try {
        // Resolve variants using cache
        const itemsWithVariants = batch.map(item => ({
          ...item,
          product_variant_id: item.variant_sku ? skuCache.get(item.variant_sku) : undefined,
        })).filter(item => item.product_variant_id)

        // Bulk insert
        await purchasingService.batchCreatePriceListItems(
          input.price_list_id,
          itemsWithVariants
        )

        processed += itemsWithVariants.length

        // Update progress (emit event or update state)
        await emitProgress({
          total: input.items.length,
          processed,
          percentage: Math.round((processed / input.items.length) * 100),
        })

      } catch (error) {
        failed.push({ batch, error: error.message })
      }
    }

    return new StepResponse({
      processed,
      failed: failed.length,
      total: input.items.length,
    })
  }
)
```

#### 4. Async Workflow
```typescript
// src/modules/purchasing/workflows/upload-price-list-async.ts
import { createWorkflow, WorkflowResponse } from "@medusajs/workflows-sdk"
import { parsePriceListStreamingStep } from "../steps/parse-price-list-streaming"
import { waitConfirmationPriceListImportStep } from "../steps/wait-confirmation-price-list-import"
import { processPriceListBatchStep } from "../steps/process-price-list-batch"
import { sendNotificationsStep } from "../../notification"

export const uploadPriceListAsyncWorkflow = createWorkflow(
  "upload-price-list-async",
  (input: { file_buffer: Buffer, supplier_id: string, ... }) => {

    // Step 1: Parse & validate (streaming)
    const parseResult = parsePriceListStreamingStep({
      file_buffer: input.file_buffer,
      supplier_id: input.supplier_id,
    })

    // Step 2: Wait for user confirmation
    waitConfirmationPriceListImportStep()

    // Step 3: Process in batches (async background)
    const processResult = processPriceListBatchStep({
      items: parseResult.items,
      price_list_id: input.price_list_id,
    }).config({ async: true, backgroundExecution: true })

    // Step 4: Notify user
    const notifications = transform({ input, processResult }, (data) => [{
      to: "",
      channel: "feed",
      template: "admin-ui",
      data: {
        title: "Price list import",
        description: `Imported ${data.processResult.processed} of ${data.processResult.total} items`,
      },
    }])
    sendNotificationsStep(notifications)

    return new WorkflowResponse({
      preview: parseResult.preview,
      summary: {
        total: parseResult.total_rows,
        preview_count: parseResult.preview.length,
        errors: parseResult.errors,
      },
    })
  }
)
```

#### 5. Client-Side Upload
```typescript
// src/admin/components/supplier-price-lists.tsx
const handleFileUpload = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', `Price List ${new Date().toISOString()}`)
  formData.append('supplier_id', supplier.id)

  // Upload and get transaction ID
  const response = await fetch(`/admin/suppliers/${supplier.id}/price-lists/import`, {
    method: 'POST',
    body: formData,
  })

  const { transaction_id, preview, summary } = await response.json()

  // Show preview to user
  setPreviewData({ preview, summary, transaction_id })
  setShowPreview(true)
}

const handleConfirmImport = async () => {
  // Confirm import
  await fetch(
    `/admin/suppliers/${supplier.id}/price-lists/import/${transaction_id}/confirm`,
    { method: 'POST' }
  )

  // Poll for status
  const pollStatus = setInterval(async () => {
    const statusRes = await fetch(
      `/admin/suppliers/${supplier.id}/price-lists/import/${transaction_id}/status`
    )
    const status = await statusRes.json()

    setProgress(status.progress)

    if (status.completed) {
      clearInterval(pollStatus)
      toast.success(`Import completed: ${status.processed} items`)
      queryClient.invalidateQueries(['supplier-price-list', supplier.id])
    }
  }, 2000)
}
```

---

## Testing Strategy

### Unit Tests

#### Parser Tests
```typescript
describe('parsePriceListStreamingStep', () => {
  it('should parse 100,000 rows without memory overflow', async () => {
    const largeCsv = generateLargeCsv(100000)
    const result = await parsePriceListStreamingStep.invoke(largeCsv)
    expect(result.items.length).toBe(100000)
  })

  it('should collect errors without stopping parsing', async () => {
    const csvWithErrors = generateCsvWithErrors(1000, 100) // 100 errors
    const result = await parsePriceListStreamingStep.invoke(csvWithErrors)
    expect(result.errors.length).toBe(100)
    expect(result.items.length).toBe(900)
  })

  it('should abort after 1000 errors', async () => {
    const csvWithManyErrors = generateCsvWithErrors(2000, 1500)
    await expect(parsePriceListStreamingStep.invoke(csvWithManyErrors))
      .rejects.toThrow('Too many errors')
  })
})
```

#### Batch Processing Tests
```typescript
describe('processPriceListBatchStep', () => {
  it('should process items in batches of 1000', async () => {
    const items = generatePriceListItems(5000)
    const result = await processPriceListBatchStep.invoke({ items, price_list_id: 'pl_123' })
    expect(result.processed).toBe(5000)
    // Verify 5 batches were created
  })

  it('should cache product lookups', async () => {
    const items = generatePriceListItems(1000)
    const spy = jest.spyOn(productModuleService, 'listProductVariants')

    await processPriceListBatchStep.invoke({ items, price_list_id: 'pl_123' })

    // Should only query once for all unique SKUs
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('should continue on batch failure', async () => {
    const items = generatePriceListItems(3000)
    // Mock failure for batch 2
    const result = await processPriceListBatchStep.invoke({ items, price_list_id: 'pl_123' })
    expect(result.failed).toBe(1)
    expect(result.processed).toBe(2000) // Batches 1 and 3
  })
})
```

### Integration Tests

```typescript
describe('Price List Import E2E', () => {
  it('should import 100K row CSV file successfully', async () => {
    const csv = generateLargeCsv(100000)
    const file = new File([csv], 'large-price-list.csv', { type: 'text/csv' })

    // Upload
    const formData = new FormData()
    formData.append('file', file)

    const uploadRes = await api.post('/admin/suppliers/sup_123/price-lists/import', formData)
    expect(uploadRes.status).toBe(202)
    const { transaction_id } = uploadRes.data

    // Confirm
    await api.post(`/admin/suppliers/sup_123/price-lists/import/${transaction_id}/confirm`)

    // Wait for completion
    await waitForWorkflowCompletion(transaction_id, 60000) // 60s timeout

    // Verify
    const priceList = await getPriceList('sup_123')
    expect(priceList.items.length).toBe(100000)
  })

  it('should show preview before confirming', async () => {
    const csv = generateLargeCsv(50000)
    const file = new File([csv], 'price-list.csv', { type: 'text/csv' })

    const uploadRes = await api.post('/admin/suppliers/sup_123/price-lists/import', file)
    const { preview, summary } = uploadRes.data

    expect(preview.length).toBeLessThanOrEqual(100)
    expect(summary.total_rows).toBe(50000)
  })
})
```

### Performance Tests

```typescript
describe('Performance Benchmarks', () => {
  it('should process 100K rows in under 5 minutes', async () => {
    const start = Date.now()
    const csv = generateLargeCsv(100000)

    await uploadPriceListAsyncWorkflow.run({ file_content: csv, ... })

    const duration = Date.now() - start
    expect(duration).toBeLessThan(5 * 60 * 1000) // 5 minutes
  })

  it('should use less than 500MB memory for 100K rows', async () => {
    const initialMemory = process.memoryUsage().heapUsed
    const csv = generateLargeCsv(100000)

    await uploadPriceListAsyncWorkflow.run({ file_content: csv, ... })

    const finalMemory = process.memoryUsage().heapUsed
    const memoryDelta = (finalMemory - initialMemory) / 1024 / 1024 // MB
    expect(memoryDelta).toBeLessThan(500)
  })
})
```

---

## Rollout Plan

### Stage 1: Internal Testing (Week 5)
- Deploy to staging environment
- Run with real-world price lists (10K-100K rows)
- Monitor memory usage, query performance
- Collect metrics on processing time

**Success Criteria**:
- 100K rows processed in < 5 minutes
- Memory usage < 500MB
- Zero production outages
- User feedback positive

### Stage 2: Beta Release (Week 6)
- Enable for select suppliers (opt-in flag)
- Provide fallback to old flow
- Monitor error rates
- Gather user feedback

**Success Criteria**:
- < 1% error rate
- 90%+ success rate on imports
- Positive user feedback
- No performance degradation

### Stage 3: Full Release (Week 7)
- Enable for all users
- Remove old import flow
- Documentation updates
- Training materials

**Success Criteria**:
- 100% of imports use new flow
- Maintained or improved success rate
- Documentation complete

---

## Monitoring & Metrics

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Import Success Rate | > 95% | < 90% |
| Avg Processing Time (100K rows) | < 5 min | > 10 min |
| Memory Usage (peak) | < 500MB | > 1GB |
| Database Query Count (per 1K rows) | < 10 | > 50 |
| Error Rate | < 5% | > 10% |
| User Confirmation Rate | > 80% | < 60% |

### Logging

```typescript
// Add structured logging
logger.info('Price list import started', {
  supplier_id,
  file_size: file.size,
  row_count: estimatedRows,
  transaction_id,
})

logger.info('Batch processed', {
  transaction_id,
  batch_number,
  batch_size,
  processed_count,
  failed_count,
  duration_ms,
})

logger.info('Price list import completed', {
  transaction_id,
  total_rows,
  processed_rows,
  failed_rows,
  duration_ms,
  memory_usage_mb,
})
```

---

## Dependencies

### NPM Packages

```json
{
  "dependencies": {
    "papaparse": "^5.4.1",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.14",
    "@types/multer": "^1.4.11"
  }
}
```

### MedusaJS Modules

- `@medusajs/framework/workflows-sdk` - Workflow engine
- `@medusajs/framework/utils` - Modules resolver
- `@medusajs/framework/http` - Middleware types
- Notification module (built-in)
- File module (built-in)

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Workflow timeout on huge files | Medium | High | Implement file chunking, increase timeout limits |
| Database connection pool exhaustion | Medium | High | Batch inserts, connection pooling tuning |
| Out of memory errors | Low | High | Streaming parser, memory monitoring, alerts |
| Data corruption during import | Low | Critical | Transaction rollback, validation, confirmation step |
| User abandons import mid-process | Medium | Low | Background execution, resume on reconnect |
| Backward compatibility issues | Low | Medium | Feature flag, gradual rollout, fallback option |

---

## Success Criteria

### Functional Requirements
- ✅ Support files with 100,000+ rows
- ✅ Process in reasonable time (< 5 min for 100K rows)
- ✅ Provide preview before import
- ✅ Show progress during import
- ✅ Handle errors gracefully
- ✅ Maintain data integrity

### Non-Functional Requirements
- ✅ Memory efficient (< 500MB for 100K rows)
- ✅ Database efficient (< 10 queries per 1K rows)
- ✅ User-friendly (clear feedback, progress tracking)
- ✅ Reliable (> 95% success rate)
- ✅ Maintainable (follows MedusaJS patterns)
- ✅ Testable (unit, integration, performance tests)

---

## Conclusion

This implementation plan leverages **MedusaJS native patterns** found in the product import system:

1. **Multer** for file uploads
2. **Async workflows** with background execution
3. **Wait/confirm pattern** for previews
4. **Streaming parsers** for memory efficiency
5. **Batch processing** for performance
6. **Notification system** for user feedback
7. **File module** for temporary storage
8. **Configurable body parser** for large payloads

By following these established patterns, we ensure:
- ✅ Consistency with MedusaJS architecture
- ✅ Maintainability and familiarity for developers
- ✅ Proven scalability and reliability
- ✅ Native integration with MedusaJS features

**Estimated Timeline**: 5-7 weeks
**Estimated Effort**: 1 developer full-time
**Risk Level**: Medium (mitigated by using proven patterns)

---

**Next Steps**:
1. Review and approve plan
2. Set up project board with tasks
3. Begin Phase 1 implementation
4. Schedule weekly progress reviews
