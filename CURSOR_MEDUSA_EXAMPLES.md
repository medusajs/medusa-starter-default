# MedusaJS Examples Available to Cursor

This file documents the MedusaJS source code examples that are now available to Cursor for better code suggestions and intellisense.

## What's Now Available

### 🏗️ **Core Modules** (`.medusa-source/packages/modules/`)
Real MedusaJS module implementations that Cursor can learn from:

- **Product Module**: Complete product management implementation
- **Order Module**: Order processing and management
- **Customer Module**: Customer and authentication patterns
- **Cart Module**: Shopping cart functionality
- **Payment Module**: Payment processing patterns
- **Fulfillment Module**: Shipping and fulfillment logic
- **Inventory Module**: Stock management
- **Pricing Module**: Dynamic pricing logic
- **Promotion Module**: Discount and promotion handling
- **Notification Module**: Event-driven notifications
- **Auth Module**: Authentication and authorization
- **Tax Module**: Tax calculation patterns
- **Region Module**: Multi-region support
- **Currency Module**: Multi-currency handling

### ⚙️ **Core Framework** (`.medusa-source/packages/core/`)
Framework utilities and patterns:

- **Workflows SDK**: Step definitions and workflow patterns
- **Framework Utils**: Helper functions and utilities
- **Types**: TypeScript type definitions
- **Modules SDK**: Module creation patterns
- **Core Flows**: Pre-built workflow implementations

### 🧪 **Integration Tests** (`.medusa-source/integration-tests/`)
Real-world usage examples:

- **Module Tests**: How to test custom modules
- **API Tests**: HTTP endpoint testing patterns
- **Workflow Tests**: Testing complex business logic
- **Helper Functions**: Utility functions for testing and development

## Benefits for Cursor

With these examples, Cursor can now:

1. **Suggest Better Code Patterns**: Understands MedusaJS conventions
2. **Provide Accurate Imports**: Knows where MedusaJS types come from
3. **Generate Module Code**: Can create modules following MedusaJS patterns
4. **Workflow Assistance**: Understands step and workflow creation
5. **Service Patterns**: Knows how to structure MedusaJS services
6. **Type Safety**: Better understanding of MedusaJS type system
7. **Testing Patterns**: Can suggest proper testing approaches

## Usage Tips

- When asking Cursor to create modules, it will now follow MedusaJS patterns
- Import suggestions will be more accurate
- Code completion will understand MedusaJS-specific types and methods
- Error detection will be more precise for MedusaJS development

## Path Mapping

The updated `tsconfig.json` includes path mapping:
- `@/*` → `./src/*` (your project files)
- `@medusajs/*` → MedusaJS source and node_modules

This means Cursor can resolve imports and provide better suggestions for both your code and MedusaJS internals. 