import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createStep } from "@medusajs/framework/workflows-sdk"
import { BRANDS_MODULE } from "../../modules/brands"

// Step to validate brand data
const validateBrandDataStep = createStep(
  "validate-brand-data",
  async (input: any, { container }) => {
    const { name, code } = input
    
    if (!name || !code) {
      throw new Error("Name and code are required")
    }
    
    if (code.length < 2 || code.length > 10) {
      throw new Error("Brand code must be between 2 and 10 characters")
    }
    
    // Convert code to uppercase for consistency
    return {
      ...input,
      code: code.toUpperCase()
    }
  }
)

// Step to check brand code uniqueness
const checkBrandCodeUniquenessStep = createStep(
  "check-brand-code-uniqueness",
  async (input: any, { container }) => {
    const brandsService = container.resolve(BRANDS_MODULE)
    
    // Check for duplicate brand codes
    const existingBrands = await brandsService.listBrands({ code: input.code })
    if (existingBrands.length > 0) {
      throw new Error(`Brand with code "${input.code}" already exists`)
    }
    
    return input
  }
)

// Step to create the brand
const createBrandStep = createStep(
  "create-brand",
  async (input: any, { container }) => {
    const brandsService = container.resolve(BRANDS_MODULE)
    
    const brandData = {
      ...input,
      display_order: input.display_order || 0,
      is_active: input.is_active !== undefined ? input.is_active : true,
      is_oem: input.is_oem !== undefined ? input.is_oem : true,
      authorized_dealer: input.authorized_dealer !== undefined ? input.authorized_dealer : false,
    }
    
    return await brandsService.createBrands(brandData)
  },
  async (brand: any, { container }) => {
    // Compensation: delete the created brand if workflow fails
    const brandsService = container.resolve(BRANDS_MODULE)
    await brandsService.deleteBrands(brand.id)
  }
)

// Main workflow
export const createBrandWorkflow = createWorkflow(
  "create-brand",
  (input: CreateBrandInput) => {
    const validatedData = validateBrandDataStep(input)
    const checkedData = checkBrandCodeUniquenessStep(validatedData)
    const brand = createBrandStep(checkedData)
    
    return new WorkflowResponse(brand)
  }
)

// Type definitions
export interface CreateBrandInput {
  name: string
  code: string
  logo_url?: string
  website_url?: string
  contact_email?: string
  contact_phone?: string
  description?: string
  country_of_origin?: string
  warranty_terms?: string
  authorized_dealer?: boolean
  is_oem?: boolean
  is_active?: boolean
  display_order?: number
  metadata?: Record<string, any>
} 