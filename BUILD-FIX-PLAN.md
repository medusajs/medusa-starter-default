# Build Fix Plan

This document outlines the issues preventing successful production build and their solutions.

## Issue 1: File Corruption in consolidate-price-lists.ts

**Problem**: The file `src/scripts/consolidate-price-lists.ts` contains corrupted content with newline characters embedded as text, causing multiple TypeScript syntax errors.

**Most Plausible Causes**:
1. File was corrupted during copy/paste operation with literal newlines
2. Version control merge conflict that wasn't properly resolved
3. Editor encoding issue that converted actual newlines to `\n` text

**Solution**: 
- Delete the corrupted file and recreate it with proper TypeScript syntax
- Or restore from a clean backup if available

---

## Issue 2: Service Method Name Mismatches

**Problem**: Multiple files are calling singular service methods (e.g., `createTechnician`) when the services only expose plural methods (e.g., `createTechnicians`).

**Most Plausible Causes**:
1. Service interfaces were refactored to use plural methods but call sites weren't updated
2. Copy-paste from examples that used different naming conventions
3. Inconsistent API design between different modules

**Solution**:
- Update all service method calls to use the correct plural method names
- Files affected:
  - `src/scripts/seed-machines.ts:70` (model property access)
  - `src/scripts/seed-technicians.ts:109` (createTechnician → createTechnicians)
  - `src/scripts/test-technicians-api.ts:25,35,54` (all technician methods)
  - `src/workflows/brands/create-brand-workflow.ts:33,56,61` (brand methods)

---

## Issue 3: Type Safety Issues with Nullable Properties

**Problem**: Multiple TypeScript errors related to null/undefined handling in invoice and service order workflows.

**Most Plausible Causes**:
1. Database schema allows null values but TypeScript interfaces expect non-null
2. Missing null checks before accessing properties
3. API responses changed to include nullable fields

**Solution**:
- Add proper null checks and type guards
- Update service interfaces to handle nullable types correctly
- Files affected:
  - `src/workflows/invoicing/steps/convert-order-to-invoice.ts`
  - `src/workflows/invoicing/steps/convert-service-order-to-invoice.ts`

---

## Issue 4: Missing Properties in Service Models

**Problem**: Service order models are missing expected properties like `time_entries` and `items`.

**Most Plausible Causes**:
1. Database models and TypeScript interfaces are out of sync
2. Eager loading relationships not configured properly
3. Service layer not including related data

**Solution**:
- Update service queries to include related data
- Fix model relationships and eager loading
- Add proper type definitions for related entities

---

## Issue 5: Inventory Service API Mismatch

**Problem**: Calling non-existent methods on inventory service (`listStockLocations`, reservation items structure).

**Most Plausible Causes**:
1. Using outdated MedusaJS v1 API patterns in v2 codebase
2. Custom wrapper service methods not implemented
3. API changed between MedusaJS versions

**Solution**:
- Update to use correct MedusaJS v2 inventory service methods
- Check `.medusa-source` for proper inventory service usage patterns
- File affected: `src/workflows/orders/create-order-with-reservations.ts`

---

## Issue 6: Vite Configuration Import Error

**Problem**: `vite.config.ts` imports `defineConfig` which doesn't exist in the installed Vite version.

**Most Plausible Causes**:
1. Vite version mismatch - using older version without `defineConfig`
2. Import should be from different package
3. Configuration needs different syntax for this Vite version

**Solution**:
- Check Vite version in `package.json` and update import accordingly
- Use proper configuration syntax for the installed version
- File affected: `vite.config.ts:1`

---

## Issue 7: Admin Widget Configuration Warnings

**Problem**: Multiple admin widgets missing required 'zone' property configuration.

**Most Plausible Causes**:
1. MedusaJS v2 admin requires explicit zone configuration
2. Widget configuration format changed between versions
3. Missing required properties in widget metadata

**Solution**:
- Add 'zone' property to all admin widget configurations
- Check MedusaJS v2 admin widget documentation for proper format
- Files affected: All files in `src/admin/widgets/`

---

## Issue 8: Build System Runtime Error

**Problem**: Rollup build failing with "Cannot add property 0, object is not extensible" error.

**Most Plausible Causes**:
1. Circular dependency in module imports
2. Frozen/sealed objects being modified during build
3. Plugin compatibility issue with Node.js version

**Solution**:
- Identify and resolve circular dependencies
- Check for immutable objects being modified
- Update build tools or Node.js version if needed

---

## Recommended Fix Order

1. **Fix file corruption** - Delete and recreate `consolidate-price-lists.ts`
2. **Fix service method names** - Quick find/replace operations
3. **Fix vite.config.ts import** - Simple import correction
4. **Add widget zone properties** - Template-based fixes
5. **Fix type safety issues** - Add null checks and proper typing
6. **Fix service model relationships** - May require database/service layer changes
7. **Fix inventory service usage** - Reference MedusaJS v2 patterns
8. **Debug build system error** - Most complex, may need dependency analysis