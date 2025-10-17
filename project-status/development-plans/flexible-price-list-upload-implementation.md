# Flexible Price List Upload Implementation Plan

## Overview

Implement a flexible, supplier-specific price list upload system that handles diverse file formats (CSV, fixed-width TXT) without breaking when suppliers change their format. Uses a hybrid approach with pre-configured templates and supplier metadata configuration.

## Business Context

- **Target Users**: 5 suppliers initially, less technical users (trainable)
- **Format Stability**: Supplier formats change infrequently
- **File Types**: CSV, fixed-width TXT files (no Excel initially)
- **Future**: AI-powered format detection (budget permitting)

## Current State

**Location**: `src/modules/purchasing/steps/parse-price-list-csv.ts`

**Problems**:
- Hardcoded CSV parser with fixed column names (variant_sku, cost_price, etc.)
- No supplier-specific format handling
- Breaks with different file formats or column structures
- Cannot handle fixed-width TXT files like Caterpillar format

**Example Problematic Format** (Fixed-width TXT):
```
CNEUR30NL_BE20251015
0000140520        LAGER                                   #02025010200000009250000000000347000001AJ15CF429C42010Y
```

Column structure:
- Onderdeelnummer (0-18): Supplier SKU
- Omschrijving onderdeel (18-58): Description
- Lijstprijs (69-82): Price (13 chars)
- etc. (14 columns total with specific widths)

## Solution Architecture

### 1. Parser Strategy Pattern

**Core Concept**: Pluggable parsers selected based on supplier configuration

**Components**:

#### Base Parser Interface
```typescript
interface PriceListParser {
  parse(fileContent: string, config: ParserConfig): ParsedPriceListItem[]
  validate(fileContent: string): ValidationResult
  detectFormat(fileContent: string): FormatDetectionResult
}

interface ParsedPriceListItem {
  supplier_sku?: string
  variant_sku?: string
  cost_price: number
  description?: string
  quantity?: number
  lead_time_days?: number
  notes?: string
}
```

#### Parser Implementations
1. **CsvParser** - Handles comma/tab/semicolon delimited files
2. **FixedWidthParser** - Handles fixed-column-width text files
3. **ExcelParser** (future) - Handles .xlsx files

#### Parser Factory
Selects appropriate parser based on:
1. Supplier metadata configuration (explicit)
2. File extension detection (fallback)
3. Content analysis (smart fallback)

### 2. Supplier Metadata Configuration

**Storage Location**: `supplier.metadata.price_list_parser`

**Schema**:
```json
{
  "price_list_parser": {
    "type": "csv" | "fixed-width" | "excel",
    "config": {
      // Common fields
      "has_header": true,
      "skip_rows": 1,

      // CSV-specific
      "delimiter": ",",
      "quote_char": "\"",
      "column_mapping": {
        "supplier_sku": "Onderdeelnummer",
        "cost_price": "Lijstprijs",
        "description": "Omschrijving onderdeel",
        "weight_kg": "Gewicht onderdeel in kg"
      },

      // Fixed-width specific
      "fixed_width_columns": [
        { "field": "supplier_sku", "start": 0, "width": 18 },
        { "field": "description", "start": 18, "width": 40 },
        { "field": "price_code", "start": 58, "width": 1 },
        { "field": "material_status", "start": 59, "width": 1 },
        { "field": "last_price_date", "start": 60, "width": 8 },
        { "field": "cost_price", "start": 69, "width": 13 },
        { "field": "weight_kg", "start": 82, "width": 5 }
      ],

      // Field transformations
      "transformations": {
        "cost_price": {
          "type": "divide",
          "divisor": 100,
          "description": "Convert cents to dollars"
        },
        "supplier_sku": {
          "type": "trim",
          "description": "Remove whitespace"
        }
      }
    }
  }
}
```

### 3. Pre-configured Templates

**Location**: `src/modules/purchasing/templates/`

**Templates to Create**:

1. **generic-csv.json** (default)
```json
{
  "name": "Generic CSV",
  "type": "csv",
  "config": {
    "delimiter": ",",
    "has_header": true,
    "column_mapping": {
      "supplier_sku": ["supplier_sku", "sku", "part_number", "part_no"],
      "cost_price": ["cost_price", "price", "net_price", "unit_price"],
      "variant_sku": ["variant_sku", "internal_sku"],
      "description": ["description", "desc", "name"],
      "quantity": ["quantity", "qty", "moq"],
      "lead_time_days": ["lead_time", "lead_time_days", "delivery_days"]
    }
  }
}
```

2. **caterpillar-fixed-width.json**
```json
{
  "name": "Caterpillar Fixed Width",
  "type": "fixed-width",
  "config": {
    "skip_rows": 1,
    "fixed_width_columns": [
      { "field": "supplier_sku", "start": 0, "width": 18 },
      { "field": "description", "start": 18, "width": 40 },
      { "field": "price_code", "start": 58, "width": 1 },
      { "field": "material_status", "start": 59, "width": 1 },
      { "field": "last_price_date", "start": 60, "width": 8 },
      { "field": "cost_price", "start": 69, "width": 13 },
      { "field": "weight_kg", "start": 82, "width": 5 },
      { "field": "packaging_unit", "start": 87, "width": 4 }
    ],
    "transformations": {
      "cost_price": { "type": "divide", "divisor": 100000 },
      "weight_kg": { "type": "divide", "divisor": 1000 },
      "supplier_sku": { "type": "trim" },
      "description": { "type": "trim" }
    }
  }
}
```

3. **generic-tsv.json** (tab-separated)
4. **semicolon-csv.json** (European CSV format)

### 4. Smart Column Matching

**Fuzzy Matching Algorithm**:
- Normalize field names (lowercase, remove underscores/spaces)
- Match common aliases (e.g., "sku" = "part_number" = "part_no")
- Levenshtein distance for close matches
- Confidence scoring (exact=100, alias=90, fuzzy=60)

**Common Aliases**:
```typescript
const FIELD_ALIASES = {
  supplier_sku: ["sku", "part_number", "part_no", "partnumber", "item_code", "onderdeelnummer"],
  cost_price: ["price", "cost", "net_price", "unit_price", "lijstprijs"],
  variant_sku: ["variant_sku", "internal_sku", "our_sku"],
  description: ["description", "desc", "name", "title", "omschrijving"],
  quantity: ["quantity", "qty", "moq", "minimum_order", "verpakkingseenheid"],
  lead_time_days: ["lead_time", "lead_time_days", "delivery_days", "delivery_time"],
  weight_kg: ["weight", "weight_kg", "gewicht"]
}
```

## Implementation Breakdown

### Phase 1: Core Parser Infrastructure

#### 1.1 Create Parser Base & Interface
**Files to Create**:
- `src/modules/purchasing/parsers/base-parser.ts`
- `src/modules/purchasing/parsers/types.ts`

**Functionality**:
- Define `PriceListParser` interface
- Define `ParserConfig`, `ParsedPriceListItem`, `ValidationResult` types
- Create abstract `BaseParser` class with common utilities

**Key Methods**:
- `parse(content, config)` - Main parsing method
- `validate(content)` - Pre-parse validation
- `detectFormat(content)` - Format detection helper
- `matchColumns(headers, fieldAliases)` - Smart column matching

---

#### 1.2 Implement CSV Parser
**Files to Create**:
- `src/modules/purchasing/parsers/csv-parser.ts`

**Functionality**:
- Parse delimiter-separated values (CSV, TSV, semicolon)
- Handle quoted fields with embedded delimiters
- Auto-detect delimiter if not specified
- Smart column mapping using fuzzy matching
- Apply field transformations

**Edge Cases**:
- Quoted fields with commas
- Empty rows
- Inconsistent column counts
- Missing headers

---

#### 1.3 Implement Fixed-Width Parser
**Files to Create**:
- `src/modules/purchasing/parsers/fixed-width-parser.ts`

**Functionality**:
- Parse fixed-column-width text files
- Extract fields based on start position + width
- Handle multi-byte characters correctly
- Apply transformations (trim, divide, multiply)

**Edge Cases**:
- Lines shorter than expected
- Multi-byte character encoding (UTF-8)
- Optional fields (missing columns)

---

#### 1.4 Create Parser Factory
**Files to Create**:
- `src/modules/purchasing/parsers/parser-factory.ts`

**Functionality**:
- Resolve parser based on supplier metadata
- Fallback to file extension detection
- Fallback to content analysis
- Load pre-configured templates
- Merge supplier overrides with templates

**Selection Logic**:
```typescript
1. Check supplier.metadata.price_list_parser.type
2. If not set, detect from file extension (.csv, .txt)
3. If still unclear, analyze first 10 lines for patterns
4. Load appropriate parser with merged config
```

---

### Phase 2: Template System

#### 2.1 Create Template Files
**Files to Create**:
- `src/modules/purchasing/templates/generic-csv.json`
- `src/modules/purchasing/templates/caterpillar-fixed-width.json`
- `src/modules/purchasing/templates/generic-tsv.json`
- `src/modules/purchasing/templates/semicolon-csv.json`

**Content**: Pre-configured parser settings (see section 3 above)

---

#### 2.2 Template Loader Utility
**Files to Create**:
- `src/modules/purchasing/utils/template-loader.ts`

**Functionality**:
- Load template JSON files
- Validate template schema
- List available templates
- Get template by name

---

### Phase 3: Workflow Integration

#### 3.1 Update Workflow Steps
**Files to Modify**:
- `src/modules/purchasing/steps/parse-price-list-csv.ts` → **RENAME** to `parse-price-list.ts`

**Changes**:
1. Remove hardcoded CSV parsing logic
2. Add supplier metadata resolution
3. Use parser factory to get appropriate parser
4. Pass parsed items to existing validation logic
5. Return enhanced error messages with line numbers

**New Input Structure**:
```typescript
type ParsePriceListStepInput = {
  file_content: string
  file_name: string // for extension detection
  supplier_id: string
  brand_id?: string
}
```

---

#### 3.2 Update Import Workflow
**Files to Modify**:
- `src/modules/purchasing/workflows/upload-price-list-csv.ts` → **RENAME** to `upload-price-list.ts`

**Changes**:
1. Accept any file type (not just CSV)
2. Pass file_name to parse step
3. Update workflow name to `upload-price-list-workflow`

---

### Phase 4: API & Admin UI

#### 4.1 Create/Update Upload API Route
**Files to Create/Modify**:
- `src/api/admin/suppliers/[id]/price-lists/import/route.ts` (create if missing)

**Functionality**:
- Accept file upload (multipart/form-data)
- Support CSV, TXT files
- Extract file content and metadata
- Call upload-price-list workflow
- Return import summary (success/error counts)

**Validation**:
- File size limit (e.g., 10MB)
- File type whitelist (.csv, .txt)
- Supplier exists and is active

---

#### 4.2 Parser Configuration API Route
**Files to Create**:
- `src/api/admin/suppliers/[id]/parser-config/route.ts`

**Endpoints**:
- `GET` - Retrieve current parser config
- `PUT` - Update parser config
- `POST /preview` - Preview file parsing with config
- `GET /templates` - List available templates

**Response Examples**:
```typescript
// GET /admin/suppliers/:id/parser-config
{
  "parser_config": { ... },
  "template_name": "caterpillar-fixed-width" | null,
  "available_templates": ["generic-csv", "caterpillar-fixed-width"]
}

// POST /admin/suppliers/:id/parser-config/preview
// Body: { file_content, config }
{
  "preview_rows": [...], // First 10 parsed rows
  "detected_fields": ["supplier_sku", "cost_price"],
  "warnings": ["Column 'description' not mapped"],
  "errors": []
}
```

---

#### 4.3 Admin UI - Upload Enhancement
**Files to Modify**:
- `src/admin/components/supplier-price-lists.tsx`

**Changes at Upload Modal** (lines 699-748):

**Current Flow**:
1. User clicks "Upload CSV"
2. Selects file
3. Uploads directly

**New Flow**:
1. User clicks "Upload Price List"
2. Selects file
3. **NEW**: System auto-parses with current config
4. **NEW**: Shows preview table (first 10 rows)
5. **NEW**: Shows detected/mapped fields
6. **NEW**: Warnings for unmapped required fields
7. **NEW**: Button "Configure Parser" (optional)
8. User confirms upload
9. Processes full import

**UI Components Needed**:
```typescript
// Preview Table
<DataTable>
  <Columns>
    <Column name="Row" />
    <Column name="Supplier SKU" />
    <Column name="Cost Price" />
    <Column name="Description" />
    <Column name="Mapped?" /> // Checkmark or warning icon
  </Columns>
</DataTable>

// Field Mapping Status
<FieldMappingStatus>
  ✓ supplier_sku → "Onderdeelnummer"
  ✓ cost_price → "Lijstprijs"
  ⚠ variant_sku → Not detected (will search by supplier_sku)
  ✓ description → "Omschrijving onderdeel"
</FieldMappingStatus>

// Actions
<Button onClick={handleConfigureParser}>Configure Parser</Button>
<Button onClick={handleConfirmUpload}>Confirm & Upload</Button>
```

---

#### 4.4 Admin UI - Parser Configuration Page
**Files to Create**:
- `src/admin/routes/suppliers/[id]/components/supplier-parser-config-section.tsx`

**Location**: Add as new section in supplier detail page (after price lists)

**UI Structure**:
```
┌─────────────────────────────────────┐
│ Parser Configuration                │
├─────────────────────────────────────┤
│ Template: [Dropdown: Generic CSV ▼] │
│ ☑ Use custom configuration          │
│                                     │
│ File Format:                        │
│ ○ CSV  ○ Fixed-Width  ○ Excel      │
│                                     │
│ CSV Settings:                       │
│ Delimiter: [, ▼]                    │
│ Has Header: ☑                       │
│                                     │
│ Column Mapping:                     │
│ ┌─────────────┬──────────────────┐  │
│ │ System Field│ File Column      │  │
│ ├─────────────┼──────────────────┤  │
│ │ supplier_sku│ [Onderdeelnumme▼]│  │
│ │ cost_price  │ [Lijstprijs    ▼]│  │
│ │ description │ [Omschrijving  ▼]│  │
│ └─────────────┴──────────────────┘  │
│                                     │
│ [Test with File] [Save Config]     │
└─────────────────────────────────────┘
```

**Functionality**:
- Select from pre-configured templates
- Toggle custom configuration mode
- Configure format type (CSV/Fixed-Width)
- Set format-specific options
- Map system fields to file columns
- Test configuration with sample file
- Save to supplier metadata

**Form Validation**:
- Required fields mapped (supplier_sku OR variant_sku, cost_price)
- Valid fixed-width column ranges (no overlaps)
- Valid transformation expressions

---

### Phase 5: Testing & Documentation

#### 5.1 Unit Tests
**Files to Create**:
- `src/modules/purchasing/parsers/__tests__/csv-parser.test.ts`
- `src/modules/purchasing/parsers/__tests__/fixed-width-parser.test.ts`
- `src/modules/purchasing/parsers/__tests__/parser-factory.test.ts`

**Test Cases**:

**CSV Parser**:
- Standard comma-delimited
- Tab-delimited
- Semicolon-delimited
- Quoted fields with embedded delimiters
- Empty rows and columns
- Missing headers
- Smart column matching

**Fixed-Width Parser**:
- Standard fixed-width parsing
- Caterpillar format (real example)
- Lines shorter than expected
- Field transformations (divide, trim)
- Multi-byte characters

**Parser Factory**:
- Resolves from supplier metadata
- Falls back to file extension
- Falls back to content detection
- Loads and merges templates
- Handles missing config gracefully

---

#### 5.2 Integration Tests
**Files to Create**:
- `src/modules/purchasing/workflows/__tests__/upload-price-list.integration.test.ts`

**Test Scenarios**:
1. Upload CSV with configured supplier
2. Upload TXT with fixed-width config
3. Upload without supplier config (uses generic template)
4. Upload with invalid format (expect errors)
5. Upload with missing required fields
6. Upload with transformation rules

---

#### 5.3 Sample Files
**Files to Create**:
- `src/modules/purchasing/test-data/sample-generic.csv`
- `src/modules/purchasing/test-data/sample-caterpillar.txt`
- `src/modules/purchasing/test-data/sample-invalid.csv`

**Purpose**: Test data for development and testing

---

#### 5.4 User Documentation
**Files to Create**:
- `docs/supplier-price-list-upload-guide.md`

**Content**:
- Overview of upload process
- How to configure parser for new supplier
- Template selection guide
- Troubleshooting common issues
- Field mapping reference
- Transformation syntax guide

---

## Database Changes

### Supplier Model Update
**File**: `src/modules/purchasing/models/supplier.model.ts`

**Current**: Already has `metadata: model.json().nullable()`

**No migration needed** - parser config will be stored in existing metadata field:
```typescript
supplier.metadata = {
  price_list_parser: { ... }, // New addition
  // other metadata
}
```

---

## Workflow Changes Summary

### Before (Current)
```
Upload CSV → Parse CSV (hardcoded) → Create Price List → Process Items
```

### After (New)
```
Upload File → Detect Format → Select Parser → Parse with Config → Validate → Create Price List → Process Items
                    ↓
            (uses supplier metadata + templates)
```

---

## Technical Dependencies

**New NPM Packages** (if needed):
- None required for CSV/TXT (use built-in Node.js)
- Future: `xlsx` for Excel support

**Existing Dependencies**:
- `@medusajs/workflows-sdk` - workflow orchestration
- `@medusajs/framework/utils` - module definition

---

## Error Handling & Validation

### Parser-Level Errors
- File encoding issues (non-UTF8)
- Malformed rows (wrong column count)
- Invalid data types (text in price field)
- Missing required columns

**Strategy**: Collect errors per row, continue parsing, return summary

### Workflow-Level Errors
- Product variant not found
- Invalid supplier configuration
- Brand filtering failures

**Strategy**: Existing error handling in `parse-price-list.ts` step

### User-Facing Messages
- "Row 15: Invalid cost_price '€12,50' - expected numeric value"
- "Column 'supplier_sku' not found in file - check parser configuration"
- "Successfully imported 450 items, 12 errors (see details)"

---

## Future Enhancements (Out of Scope)

1. **AI-Powered Format Detection**
   - Auto-detect column mapping from sample file
   - Suggest parser configuration
   - Learn from corrections

2. **Excel Support**
   - Handle .xlsx files
   - Multiple sheet support
   - Formula evaluation

3. **Scheduled Imports**
   - SFTP/FTP file pickup
   - Email attachment parsing
   - Automatic imports on schedule

4. **Advanced Transformations**
   - Conditional logic (if/then)
   - Lookup tables (map supplier codes)
   - Calculated fields

5. **Import History & Diff**
   - Track price changes over time
   - Diff view between imports
   - Rollback capability

---

## Success Criteria

✅ **Functional Requirements**:
1. Upload and parse standard CSV files without configuration
2. Upload and parse Caterpillar fixed-width TXT files with configuration
3. Configure parser settings per supplier via admin UI
4. Preview parsed data before confirming import
5. Display clear error messages for parsing failures

✅ **Non-Functional Requirements**:
1. Parse 10,000 row file in < 30 seconds
2. Handle files up to 10MB
3. Support 5+ suppliers with different formats
4. Zero downtime for existing imports during rollout

✅ **User Experience**:
1. Non-technical users can upload with 2 clicks (no config needed for CSV)
2. Technical users can configure parsers in < 5 minutes
3. Clear preview shows what will be imported
4. Detailed error messages explain what's wrong

---

## Rollout Plan

### Stage 1: Foundation (Backend)
- Implement parser infrastructure
- Create template system
- Update workflow steps
- Unit tests

### Stage 2: API Layer
- Create/update upload endpoint
- Add parser config endpoints
- Integration tests

### Stage 3: Admin UI (Basic)
- Enhanced upload modal with preview
- Basic parser config page
- User testing with 1 supplier

### Stage 4: Admin UI (Advanced)
- Advanced configuration options
- Field transformation UI
- Template management

### Stage 5: Documentation & Training
- User guide
- Video tutorials
- Train end users

---

## Implementation Notes for AI Orchestrator

### Code Style
- Follow existing MedusaJS v2 patterns
- Use TypeScript strict mode
- Async/await for all async operations
- Descriptive variable names

### File Organization
- Keep parsers isolated in `/parsers` directory
- Co-locate tests with implementation
- Use barrel exports (index.ts) for clean imports

### Workflow Best Practices
- Each step should be compensatable (for rollback)
- Steps should be pure functions where possible
- Validate inputs at step boundaries
- Return detailed error information

### Admin UI Best Practices
- Use Medusa UI components (`@medusajs/ui`)
- Follow existing patterns from supplier-price-lists.tsx
- Responsive design (mobile-friendly)
- Loading states for async operations
- Toast notifications for user feedback

### Testing Strategy
- Unit tests for each parser
- Integration tests for workflows
- Manual testing with real supplier files
- Edge case testing (malformed files)

---

## Key Files Reference

### Files to Create (23 new files)
```
src/modules/purchasing/
  ├── parsers/
  │   ├── base-parser.ts
  │   ├── types.ts
  │   ├── csv-parser.ts
  │   ├── fixed-width-parser.ts
  │   ├── parser-factory.ts
  │   └── __tests__/
  │       ├── csv-parser.test.ts
  │       ├── fixed-width-parser.test.ts
  │       └── parser-factory.test.ts
  ├── templates/
  │   ├── generic-csv.json
  │   ├── caterpillar-fixed-width.json
  │   ├── generic-tsv.json
  │   └── semicolon-csv.json
  ├── utils/
  │   └── template-loader.ts
  ├── test-data/
  │   ├── sample-generic.csv
  │   ├── sample-caterpillar.txt
  │   └── sample-invalid.csv
  └── workflows/
      └── __tests__/
          └── upload-price-list.integration.test.ts

src/api/admin/suppliers/[id]/
  └── parser-config/
      └── route.ts

src/admin/routes/suppliers/[id]/components/
  └── supplier-parser-config-section.tsx

docs/
  └── supplier-price-list-upload-guide.md
```

### Files to Modify (4 files)
```
src/modules/purchasing/steps/parse-price-list-csv.ts → parse-price-list.ts (rename + refactor)
src/modules/purchasing/workflows/upload-price-list-csv.ts → upload-price-list.ts (rename + update)
src/api/admin/suppliers/[id]/price-lists/import/route.ts (update if exists, create if not)
src/admin/components/supplier-price-lists.tsx (enhance upload modal)
```

---

## Questions for Implementation

Before starting implementation, clarify:

1. **Caterpillar Format Details**:
   - What is the exact divisor for price field? (example shows 13-digit number, need conversion factor)
   - Are all 14 columns needed or just subset?

2. **Validation Requirements**:
   - Should import fail if ANY row has error, or continue and report?
   - Required vs optional fields priority?

3. **UI Complexity**:
   - Phase 3 parser config page - how detailed? (basic vs advanced mode?)
   - Test file upload in config page - full import preview or just validation?

4. **Performance**:
   - Expected max file size?
   - Should large files be processed async with progress notification?

---

## End of Implementation Plan

This document provides complete functional and technical specifications for implementing flexible price list uploads. The AI orchestrator should follow phases sequentially, creating tests alongside implementation, and maintain existing code patterns throughout.
