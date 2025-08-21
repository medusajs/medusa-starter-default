import { medusaIntegrationTestRunner } from "medusa-test-utils"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import { parsePriceListCSVStep } from "../steps/parse-price-list-csv"
import BrandsModule from "../../brands"
import ProductModule from "@medusajs/medusa/product"
import { PURCHASING_MODULE } from "../index"

jest.setTimeout(30000)

medusaIntegrationTestRunner({
  testSuite: ({ container }) => {
    let linkService: any
    let remoteQuery: any
    let brandsService: any
    let purchasingService: any
    let productService: any
    let supplierId: string
    let brandAId: string
    let brandBId: string
    let productId: string
    let variantAId: string
    let variantBId: string

    beforeAll(async () => {
      linkService = container.resolve(ContainerRegistrationKeys.LINK)
      remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
      brandsService = container.resolve("BrandsModuleService")
      purchasingService = container.resolve(PURCHASING_MODULE)
      productService = container.resolve("ProductModuleService")

      // Set up test environment variable for feature flag
      process.env.MEDUSA_FF_BRAND_AWARE_PURCHASING = "true"
    })

    beforeEach(async () => {
      // Create brands
      const brandA = await brandsService.createBrands({
        name: "Brand A",
        code: "BRND_A",
        is_oem: true,
      })
      brandAId = brandA.id

      const brandB = await brandsService.createBrands({
        name: "Brand B", 
        code: "BRND_B",
        is_oem: false,
      })
      brandBId = brandB.id

      // Create supplier
      const supplier = await purchasingService.createSuppliers({
        name: "Test Supplier",
        code: "SUPP01",
        email: "supplier@test.com",
      })
      supplierId = supplier.id

      // Link supplier to brands
      await linkService.create({
        [PURCHASING_MODULE]: supplierId,
        [BrandsModule.linkable.brand.serviceName]: brandAId,
      })

      await linkService.create({
        [PURCHASING_MODULE]: supplierId,
        [BrandsModule.linkable.brand.serviceName]: brandBId,
      })

      // Create product and variants
      const product = await productService.createProducts({
        title: "Test Product",
        handle: "test-product",
        options: [{ title: "Color", values: ["Red", "Blue"] }],
      })
      productId = product.id

      const variantA = await productService.createProductVariants({
        title: "Red Variant",
        sku: "TEST-RED-001",
        product_id: productId,
        options: { Color: "Red" },
      })
      variantAId = variantA.id

      const variantB = await productService.createProductVariants({
        title: "Blue Variant", 
        sku: "TEST-BLUE-001",
        product_id: productId,
        options: { Color: "Blue" },
      })
      variantBId = variantB.id

      // Link variants to brands
      await linkService.create({
        [ProductModule.linkable.productVariant.serviceName]: variantAId,
        [BrandsModule.linkable.brand.serviceName]: brandAId,
      })

      await linkService.create({
        [ProductModule.linkable.productVariant.serviceName]: variantBId,
        [BrandsModule.linkable.brand.serviceName]: brandBId,
      })
    })

    describe("CSV Parsing with Brand Constraints", () => {
      it("should parse CSV with brand constraints enabled", async () => {
        const csvContent = `variant_sku,supplier_sku,brand_code,net_price,quantity
TEST-RED-001,SUPP-RED-001,BRND_A,1000,1
TEST-BLUE-001,SUPP-BLUE-001,BRND_B,1200,2`

        const input = {
          supplier_id: supplierId,
          brand_id: null, // No specific brand filter
          csv_content: csvContent,
          upload_filename: "test.csv",
        }

        const result = await parsePriceListCSVStep(input, { container })

        expect(result.success).toBe(true)
        expect(result.parsed_items.length).toBe(2)
        expect(result.errors.length).toBe(0)

        // Verify both items were parsed successfully
        const redItem = result.parsed_items.find((item: any) => item.variant_sku === "TEST-RED-001")
        const blueItem = result.parsed_items.find((item: any) => item.variant_sku === "TEST-BLUE-001")

        expect(redItem).toBeDefined()
        expect(redItem.product_variant_id).toBe(variantAId)
        expect(redItem.net_price).toBe(1000)

        expect(blueItem).toBeDefined()
        expect(blueItem.product_variant_id).toBe(variantBId)
        expect(blueItem.net_price).toBe(1200)
      })

      it("should filter CSV rows by price list brand_id", async () => {
        const csvContent = `variant_sku,supplier_sku,brand_code,net_price,quantity
TEST-RED-001,SUPP-RED-001,BRND_A,1000,1
TEST-BLUE-001,SUPP-BLUE-001,BRND_B,1200,2`

        const input = {
          supplier_id: supplierId,
          brand_id: brandAId, // Filter for Brand A only
          csv_content: csvContent,
          upload_filename: "test.csv",
        }

        const result = await parsePriceListCSVStep(input, { container })

        expect(result.success).toBe(true)
        expect(result.parsed_items.length).toBe(1)
        expect(result.errors.length).toBe(1) // One item should be filtered out

        // Only the Brand A item should be parsed
        const redItem = result.parsed_items[0]
        expect(redItem.variant_sku).toBe("TEST-RED-001")
        expect(redItem.product_variant_id).toBe(variantAId)

        // The Brand B item should generate an error
        expect(result.errors[0]).toContain("does not belong to the target brand")
      })

      it("should reject variants from brands not supplied by supplier", async () => {
        // Create a brand not linked to the supplier
        const brandC = await brandsService.createBrands({
          name: "Brand C",
          code: "BRND_C",
        })

        // Create variant linked to Brand C
        const variantC = await productService.createProductVariants({
          title: "Green Variant",
          sku: "TEST-GREEN-001", 
          product_id: productId,
          options: { Color: "Green" },
        })

        await linkService.create({
          [ProductModule.linkable.productVariant.serviceName]: variantC.id,
          [BrandsModule.linkable.brand.serviceName]: brandC.id,
        })

        const csvContent = `variant_sku,supplier_sku,brand_code,net_price,quantity
TEST-RED-001,SUPP-RED-001,BRND_A,1000,1
TEST-GREEN-001,SUPP-GREEN-001,BRND_C,1500,1`

        const input = {
          supplier_id: supplierId,
          brand_id: null,
          csv_content: csvContent,
          upload_filename: "test.csv",
        }

        const result = await parsePriceListCSVStep(input, { container })

        expect(result.success).toBe(false)
        expect(result.parsed_items.length).toBe(1) // Only Brand A item
        expect(result.errors.length).toBe(1)

        // Brand A item should be parsed successfully
        const redItem = result.parsed_items[0]
        expect(redItem.variant_sku).toBe("TEST-RED-001")

        // Brand C item should generate an error
        expect(result.errors[0]).toContain("Brand BRND_C is not supplied by this supplier")
      })

      it("should handle missing brand_code column gracefully", async () => {
        const csvContent = `variant_sku,supplier_sku,net_price,quantity
TEST-RED-001,SUPP-RED-001,1000,1
TEST-BLUE-001,SUPP-BLUE-001,1200,2`

        const input = {
          supplier_id: supplierId,
          brand_id: null,
          csv_content: csvContent,
          upload_filename: "test.csv",
        }

        const result = await parsePriceListCSVStep(input, { container })

        expect(result.success).toBe(true)
        expect(result.parsed_items.length).toBe(2)
        expect(result.warnings.length).toBeGreaterThan(0)

        // Should still match variants by SKU even without brand_code
        const redItem = result.parsed_items.find((item: any) => item.variant_sku === "TEST-RED-001")
        const blueItem = result.parsed_items.find((item: any) => item.variant_sku === "TEST-BLUE-001")

        expect(redItem).toBeDefined()
        expect(blueItem).toBeDefined()
      })

      it("should handle ambiguous SKU matches with brand disambiguation", async () => {
        // Create another product with the same SKU but different brand
        const product2 = await productService.createProducts({
          title: "Product 2",
          handle: "product-2",
          options: [{ title: "Size", values: ["Small"] }],
        })

        const variantDuplicate = await productService.createProductVariants({
          title: "Duplicate SKU Variant",
          sku: "TEST-RED-001", // Same SKU as variantA
          product_id: product2.id,
          options: { Size: "Small" },
        })

        // Link to Brand B (different from variantA which is Brand A)
        await linkService.create({
          [ProductModule.linkable.productVariant.serviceName]: variantDuplicate.id,
          [BrandsModule.linkable.brand.serviceName]: brandBId,
        })

        const csvContent = `variant_sku,supplier_sku,brand_code,net_price,quantity
TEST-RED-001,SUPP-RED-001,BRND_A,1000,1
TEST-RED-001,SUPP-RED-002,BRND_B,1100,1`

        const input = {
          supplier_id: supplierId,
          brand_id: null,
          csv_content: csvContent,
          upload_filename: "test.csv",
        }

        const result = await parsePriceListCSVStep(input, { container })

        expect(result.success).toBe(true)
        expect(result.parsed_items.length).toBe(2)

        // Should correctly disambiguate by brand
        const brandAItem = result.parsed_items.find((item: any) => 
          item.supplier_sku === "SUPP-RED-001"
        )
        const brandBItem = result.parsed_items.find((item: any) => 
          item.supplier_sku === "SUPP-RED-002"
        )

        expect(brandAItem.product_variant_id).toBe(variantAId)
        expect(brandBItem.product_variant_id).toBe(variantDuplicate.id)
      })

      it("should handle invalid brand codes", async () => {
        const csvContent = `variant_sku,supplier_sku,brand_code,net_price,quantity
TEST-RED-001,SUPP-RED-001,INVALID_BRAND,1000,1`

        const input = {
          supplier_id: supplierId,
          brand_id: null,
          csv_content: csvContent,
          upload_filename: "test.csv",
        }

        const result = await parsePriceListCSVStep(input, { container })

        expect(result.success).toBe(false)
        expect(result.parsed_items.length).toBe(0)
        expect(result.errors.length).toBe(1)
        expect(result.errors[0]).toContain("Brand code 'INVALID_BRAND' not found")
      })

      it("should work with feature flag disabled", async () => {
        // Temporarily disable feature flag
        process.env.MEDUSA_FF_BRAND_AWARE_PURCHASING = "false"

        const csvContent = `variant_sku,supplier_sku,brand_code,net_price,quantity
TEST-RED-001,SUPP-RED-001,BRND_A,1000,1
TEST-BLUE-001,SUPP-BLUE-001,BRND_B,1200,2`

        const input = {
          supplier_id: supplierId,
          brand_id: null,
          csv_content: csvContent,
          upload_filename: "test.csv",
        }

        const result = await parsePriceListCSVStep(input, { container })

        expect(result.success).toBe(true)
        expect(result.parsed_items.length).toBe(2)
        expect(result.errors.length).toBe(0)

        // Should ignore brand constraints when feature flag is disabled
        expect(result.warnings).toContain("Brand-aware purchasing feature is disabled")

        // Re-enable for cleanup
        process.env.MEDUSA_FF_BRAND_AWARE_PURCHASING = "true"
      })
    })

    describe("CSV Parsing Error Cases", () => {
      it("should handle malformed CSV", async () => {
        const csvContent = `variant_sku,supplier_sku,brand_code,net_price,quantity
TEST-RED-001,SUPP-RED-001,BRND_A,1000
TEST-BLUE-001,SUPP-BLUE-001,BRND_B,1200,2,extra_column`

        const input = {
          supplier_id: supplierId,
          brand_id: null,
          csv_content: csvContent,
          upload_filename: "test.csv",
        }

        const result = await parsePriceListCSVStep(input, { container })

        expect(result.success).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })

      it("should handle empty CSV", async () => {
        const csvContent = `variant_sku,supplier_sku,brand_code,net_price,quantity`

        const input = {
          supplier_id: supplierId,
          brand_id: null,
          csv_content: csvContent,
          upload_filename: "test.csv",
        }

        const result = await parsePriceListCSVStep(input, { container })

        expect(result.success).toBe(true)
        expect(result.parsed_items.length).toBe(0)
        expect(result.warnings).toContain("CSV file contains no data rows")
      })

      it("should handle missing required columns", async () => {
        const csvContent = `variant_sku,brand_code
TEST-RED-001,BRND_A`

        const input = {
          supplier_id: supplierId,
          brand_id: null,
          csv_content: csvContent,
          upload_filename: "test.csv",
        }

        const result = await parsePriceListCSVStep(input, { container })

        expect(result.success).toBe(false)
        expect(result.errors).toContain("Missing required column: net_price")
      })

      it("should validate numeric fields", async () => {
        const csvContent = `variant_sku,supplier_sku,brand_code,net_price,quantity
TEST-RED-001,SUPP-RED-001,BRND_A,invalid_price,invalid_quantity`

        const input = {
          supplier_id: supplierId,
          brand_id: null,
          csv_content: csvContent,
          upload_filename: "test.csv",
        }

        const result = await parsePriceListCSVStep(input, { container })

        expect(result.success).toBe(false)
        expect(result.errors.some(error => error.includes("Invalid net_price"))).toBe(true)
        expect(result.errors.some(error => error.includes("Invalid quantity"))).toBe(true)
      })
    })

    afterAll(async () => {
      // Clean up environment
      delete process.env.MEDUSA_FF_BRAND_AWARE_PURCHASING
    })
  },
})