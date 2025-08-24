import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import BrandsModule from "../index"
import ProductModule from "@medusajs/medusa/product"

jest.setTimeout(30000)

medusaIntegrationTestRunner({
  testSuite: ({ container, api, getContainer }) => {
    let linkService: any
    let remoteQuery: any
    let brandId: string
    let productId: string
    let variantId: string

    beforeAll(async () => {
      linkService = container.resolve(ContainerRegistrationKeys.LINK)
      remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    })

    beforeEach(async () => {
      // Create a brand for testing
      const brandsService = container.resolve("BrandsModuleService")
      const brand = await brandsService.createBrands({
        name: "Test Brand",
        code: "TEST",
        is_oem: true,
        authorized_dealer: true,
      })
      brandId = brand.id

      // Create a product and variant for testing
      const productService = container.resolve("ProductModuleService")
      const product = await productService.createProducts({
        title: "Test Product",
        handle: "test-product",
        options: [
          {
            title: "Size",
            values: ["S", "M", "L"],
          },
        ],
      })
      productId = product.id

      const variant = await productService.createProductVariants({
        title: "Test Variant",
        product_id: productId,
        options: { Size: "M" },
      })
      variantId = variant.id
    })

    describe("Variant-Brand Link Management", () => {
      it("should create a variant-brand link", async () => {
        // Create the link
        await linkService.create({
          linkDefinition: {
            left: {
              linkable: ProductModule.linkable.productVariant,
            },
            right: {
              linkable: BrandsModule.linkable.brand,
            },
          },
          data: [{ product_variant_id: variantId, brand_id: brandId } as any],
        } as any)

        // Verify the link was created
        const queryObj = remoteQueryObjectFromString({
          entryPoint: "product_variant",
          fields: ["id", "title", "brand.*"],
          variables: {
            filters: { id: variantId },
            limit: 1,
          },
        })

        const [variant] = await remoteQuery(queryObj)
        
        expect(variant).toBeDefined()
        expect(variant.brand).toBeDefined()
        expect(variant.brand.id).toBe(brandId)
        expect(variant.brand.name).toBe("Test Brand")
        expect(variant.brand.code).toBe("TEST")
      })

      it("should retrieve variants by brand", async () => {
        // Create the link
        await linkService.create({
          linkDefinition: {
            left: {
              linkable: ProductModule.linkable.productVariant,
            },
            right: {
              linkable: BrandsModule.linkable.brand,
            },
          },
          data: [{ product_variant_id: variantId, brand_id: brandId } as any],
        } as any)

        // Query variants by brand
        const queryObj = remoteQueryObjectFromString({
          entryPoint: "product_variant",
          fields: ["id", "title", "brand.*"],
          variables: {
            filters: { "brand.id": brandId },
            limit: 10,
          },
        })

        const variants = await remoteQuery(queryObj)
        
        expect(variants).toBeDefined()
        expect(Array.isArray(variants)).toBe(true)
        expect(variants.length).toBeGreaterThan(0)
        
        const foundVariant = variants.find((v: any) => v.id === variantId)
        expect(foundVariant).toBeDefined()
        expect(foundVariant.brand.id).toBe(brandId)
      })

      it("should update a variant's brand by dismissing old link and creating new one", async () => {
        // Create initial link
        await linkService.create({
          linkDefinition: {
            left: {
              linkable: ProductModule.linkable.productVariant,
            },
            right: {
              linkable: BrandsModule.linkable.brand,
            },
          },
          data: [{ product_variant_id: variantId, brand_id: brandId } as any],
        } as any)

        // Create another brand
        const brandsService = container.resolve("BrandsModuleService")
        const newBrand = await brandsService.createBrands({
          name: "New Brand",
          code: "NEW",
          is_oem: false,
          authorized_dealer: false,
        })

        // Remove old link
        await linkService.dismiss({
          [ProductModule.linkable.productVariant]: variantId,
          [BrandsModule.linkable.brand]: brandId,
        })

        // Create new link
        await linkService.create({
          [ProductModule.linkable.productVariant]: variantId,
          [BrandsModule.linkable.brand]: newBrand.id,
        })

        // Verify the new link
        const queryObj = remoteQueryObjectFromString({
          entryPoint: "product_variant",
          fields: ["id", "brand.*"],
          variables: {
            filters: { id: variantId },
            limit: 1,
          },
        })

        const [variant] = await remoteQuery(queryObj)
        
        expect(variant.brand.id).toBe(newBrand.id)
        expect(variant.brand.name).toBe("New Brand")
        expect(variant.brand.code).toBe("NEW")
      })

      it("should remove a variant-brand link", async () => {
        // Create the link
        await linkService.create({
          linkDefinition: {
            left: {
              linkable: ProductModule.linkable.productVariant,
            },
            right: {
              linkable: BrandsModule.linkable.brand,
            },
          },
          data: [{ product_variant_id: variantId, brand_id: brandId } as any],
        } as any)

        // Verify link exists
        let queryObj = remoteQueryObjectFromString({
          entryPoint: "product_variant",
          fields: ["id", "brand.*"],
          variables: {
            filters: { id: variantId },
            limit: 1,
          },
        })

        let [variant] = await remoteQuery(queryObj)
        expect(variant.brand).toBeDefined()

        // Remove the link
        await linkService.dismiss({
          [ProductModule.linkable.productVariant]: variantId,
          [BrandsModule.linkable.brand]: brandId,
        })

        // Verify link is removed
        const [variant] = await remoteQuery(queryObj)
        expect(variant.brand).toBeUndefined()
      })

      it("should handle multiple variants linked to the same brand", async () => {
        // Create another variant
        const productService = container.resolve("ProductModuleService")
        const variant2 = await productService.createProductVariants({
          title: "Test Variant 2",
          product_id: productId,
          options: { Size: "L" },
        })

        // Link both variants to the same brand
        await linkService.create({
          linkDefinition: {
            left: {
              linkable: ProductModule.linkable.productVariant,
            },
            right: {
              linkable: BrandsModule.linkable.brand,
            },
          },
          data: [{ product_variant_id: variantId, brand_id: brandId } as any],
        } as any)

        await linkService.create({
          [ProductModule.linkable.productVariant]: variant2.id,
          [BrandsModule.linkable.brand]: brandId,
        })

        // Query all variants for this brand
        const queryObj = remoteQueryObjectFromString({
          entryPoint: "product_variant",
          fields: ["id", "title", "brand.id"],
          variables: {
            filters: { "brand.id": brandId },
            limit: 10,
          },
        })

        const variants = await remoteQuery(queryObj)
        
        expect(variants.length).toBe(2)
        expect(variants.every((v: any) => v.brand.id === brandId)).toBe(true)
        
        const variantIds = variants.map((v: any) => v.id).sort()
        expect(variantIds).toContain(variantId)
        expect(variantIds).toContain(variant2.id)
      })

      it("should enforce one brand per variant constraint", async () => {
        // Create another brand
        const brandsService = container.resolve("BrandsModuleService")
        const brand2 = await brandsService.createBrands({
          name: "Brand 2",
          code: "BR2",
          is_oem: false,
          authorized_dealer: true,
        })

        // Link variant to first brand
        await linkService.create({
          linkDefinition: {
            left: {
              linkable: ProductModule.linkable.productVariant,
            },
            right: {
              linkable: BrandsModule.linkable.brand,
            },
          },
          data: [{ product_variant_id: variantId, brand_id: brandId } as any],
        } as any)

        // Try to link to second brand (should replace the first)
        await linkService.dismiss({
          [ProductModule.linkable.productVariant]: variantId,
          [BrandsModule.linkable.brand]: brandId,
        })

        await linkService.create({
          [ProductModule.linkable.productVariant]: variantId,
          [BrandsModule.linkable.brand]: brand2.id,
        })

        // Verify only the second brand is linked
        const queryObj = remoteQueryObjectFromString({
          entryPoint: "product_variant",
          fields: ["id", "brand.*"],
          variables: {
            filters: { id: variantId },
            limit: 1,
          },
        })

        const [variant] = await remoteQuery(queryObj)
        
        expect(variant.brand.id).toBe(brand2.id)
        expect(variant.brand.name).toBe("Brand 2")
      })

      it("should handle variant with no brand (null brand)", async () => {
        // Query a variant with no brand links
        const queryObj = remoteQueryObjectFromString({
          entryPoint: "product_variant",
          fields: ["id", "title", "brand.*"],
          variables: {
            filters: { id: variantId },
            limit: 1,
          },
        })

        const [variant] = await remoteQuery(queryObj)
        
        expect(variant).toBeDefined()
        expect(variant.brand).toBeUndefined()
      })
    })

    describe("Brand-Variant Query Patterns", () => {
      beforeEach(async () => {
        // Set up multiple variants and brands for complex queries
        const brandsService = container.resolve("BrandsModuleService")
        const productService = container.resolve("ProductModuleService")

        const brand1 = await brandsService.createBrands({
          name: "Brand A",
          code: "BA",
          is_oem: true,
        })

        const brand2 = await brandsService.createBrands({
          name: "Brand B", 
          code: "BB",
          is_oem: false,
        })

        const product2 = await productService.createProducts({
          title: "Product 2",
          handle: "product-2",
          options: [{ title: "Color", values: ["Red", "Blue"] }],
        })

        const variant1 = await productService.createProductVariants({
          title: "Variant A1",
          product_id: productId,
          options: { Size: "S" },
        })

        const variant2 = await productService.createProductVariants({
          title: "Variant A2", 
          product_id: productId,
          options: { Size: "L" },
        })

        const variant3 = await productService.createProductVariants({
          title: "Variant B1",
          product_id: product2.id,
          options: { Color: "Red" },
        })

        // Link variants to brands
        await linkService.create({
          [ProductModule.linkable.productVariant]: variant1.id,
          [BrandsModule.linkable.brand]: brand1.id,
        })

        await linkService.create({
          [ProductModule.linkable.productVariant]: variant2.id,
          [BrandsModule.linkable.brand]: brand1.id,
        })

        await linkService.create({
          [ProductModule.linkable.productVariant]: variant3.id,
          [BrandsModule.linkable.brand]: brand2.id,
        })
      })

      it("should filter products by variant brand", async () => {
        const queryObj = remoteQueryObjectFromString({
          entryPoint: "product",
          fields: ["id", "title", "variants.id", "variants.brand.*"],
          variables: {
            filters: { "variants.brand.code": "BA" },
            limit: 10,
          },
        })

        const products = await remoteQuery(queryObj)
        
        expect(products.length).toBeGreaterThan(0)
        
        // All returned products should have at least one variant with Brand A
        products.forEach((product: any) => {
          const hasTargetBrand = product.variants.some(
            (variant: any) => variant.brand?.code === "BA"
          )
          expect(hasTargetBrand).toBe(true)
        })
      })

      it("should count variants per brand", async () => {
        // Query all variants with brands
        const queryObj = remoteQueryObjectFromString({
          entryPoint: "product_variant",
          fields: ["id", "brand.code"],
          variables: {
            filters: { "brand.id": { $ne: null } },
            limit: 100,
          },
        })

        const variants = await remoteQuery(queryObj)
        
        // Count by brand
        const brandCounts = variants.reduce((acc: any, variant: any) => {
          if (variant.brand?.code) {
            acc[variant.brand.code] = (acc[variant.brand.code] || 0) + 1
          }
          return acc
        }, {})

        expect(brandCounts.BA).toBe(2)  // 2 variants for Brand A
        expect(brandCounts.BB).toBe(1)  // 1 variant for Brand B
      })
    })
  },
})