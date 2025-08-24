import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import BrandsModule from "../../brands"
import { PURCHASING_MODULE } from "../index"

jest.setTimeout(30000)

medusaIntegrationTestRunner({
  testSuite: ({ container, api }) => {
    let linkService: any
    let remoteQuery: any
    let purchasingService: any
    let brandsService: any
    let brandId: string
    let brand2Id: string
    let supplierId: string

    beforeAll(async () => {
      linkService = container.resolve(ContainerRegistrationKeys.LINK)
      remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
      purchasingService = container.resolve(PURCHASING_MODULE)
      brandsService = container.resolve("BrandsModuleService")
    })

    beforeEach(async () => {
      // Create brands for testing
      const brand1 = await brandsService.createBrands({
        name: "Test Brand 1",
        code: "TB1",
        is_oem: true,
        authorized_dealer: true,
      })
      brandId = brand1.id

      const brand2 = await brandsService.createBrands({
        name: "Test Brand 2", 
        code: "TB2",
        is_oem: false,
        authorized_dealer: false,
      })
      brand2Id = brand2.id

      // Create a supplier for testing
      const supplier = await purchasingService.createSuppliers({
        name: "Test Supplier",
        code: "TS001",
        email: "test@supplier.com",
        phone: "+1234567890",
        address_line_1: "123 Test St",
        city: "Test City",
        country_code: "US",
        postal_code: "12345",
      })
      supplierId = supplier.id
    })

    describe("Supplier-Brand Link Management", () => {
      it("should create a supplier-brand link", async () => {
        // Create the link
        await linkService.create({
          [PURCHASING_MODULE]: supplierId,
          [BrandsModule.linkable.brand]: brandId,
        })

        // Verify the link was created by querying supplier brands
        const response = await api.get(`/admin/suppliers/${supplierId}/brands`)
        
        expect(response.status).toBe(200)
        expect(response.data.brands).toBeDefined()
        expect(response.data.brands.length).toBe(1)
        expect(response.data.brands[0].id).toBe(brandId)
        expect(response.data.brands[0].name).toBe("Test Brand 1")
      })

      it("should create multiple supplier-brand links", async () => {
        // Create links to both brands
        await linkService.create({
          [PURCHASING_MODULE]: supplierId,
          [BrandsModule.linkable.brand]: brandId,
        })

        await linkService.create({
          [PURCHASING_MODULE]: supplierId,
          [BrandsModule.linkable.brand]: brand2Id,
        })

        // Verify both links exist
        const response = await api.get(`/admin/suppliers/${supplierId}/brands`)
        
        expect(response.status).toBe(200)
        expect(response.data.brands.length).toBe(2)
        
        const brandIds = response.data.brands.map((b: any) => b.id).sort()
        expect(brandIds).toContain(brandId)
        expect(brandIds).toContain(brand2Id)
      })

      it("should remove a supplier-brand link", async () => {
        // Create the link
        await linkService.create({
          [PURCHASING_MODULE]: supplierId,
          [BrandsModule.linkable.brand]: brandId,
        })

        // Verify link exists
        let response = await api.get(`/admin/suppliers/${supplierId}/brands`)
        expect(response.data.brands.length).toBe(1)

        // Remove the link
        await linkService.dismiss({
          [PURCHASING_MODULE]: supplierId,
          [BrandsModule.linkable.brand]: brandId,
        })

        // Verify link is removed
        response = await api.get(`/admin/suppliers/${supplierId}/brands`)
        expect(response.data.brands.length).toBe(0)
      })

      it("should handle adding and removing brands via API", async () => {
        // Add brand via API
        let response = await api.post(`/admin/suppliers/${supplierId}/brands`, {
          brand_id: brandId,
        })
        expect(response.status).toBe(200)

        // Verify brand was added
        response = await api.get(`/admin/suppliers/${supplierId}/brands`)
        expect(response.data.brands.length).toBe(1)
        expect(response.data.brands[0].id).toBe(brandId)

        // Remove brand via API
        response = await api.delete(`/admin/suppliers/${supplierId}/brands/${brandId}`)
        expect(response.status).toBe(200)

        // Verify brand was removed
        response = await api.get(`/admin/suppliers/${supplierId}/brands`)
        expect(response.data.brands.length).toBe(0)
      })

      it("should prevent duplicate supplier-brand links", async () => {
        // Create the link
        await linkService.create({
          [PURCHASING_MODULE]: supplierId,
          [BrandsModule.linkable.brand]: brandId,
        })

        // Try to create the same link again
        await linkService.create({
          [PURCHASING_MODULE]: supplierId,
          [BrandsModule.linkable.brand]: brandId,
        })

        // Should still have only one link
        const response = await api.get(`/admin/suppliers/${supplierId}/brands`)
        expect(response.data.brands.length).toBe(1)
      })

      it("should handle multiple suppliers linked to same brand", async () => {
        // Create another supplier
        const supplier2 = await purchasingService.createSuppliers({
          name: "Test Supplier 2",
          code: "TS002",
          email: "test2@supplier.com",
          phone: "+1234567891",
          address_line_1: "456 Test Ave",
          city: "Test City 2", 
          country_code: "US",
          postal_code: "54321",
        })

        // Link both suppliers to the same brand
        await linkService.create({
          [PURCHASING_MODULE]: supplierId,
          [BrandsModule.linkable.brand]: brandId,
        })

        await linkService.create({
          [PURCHASING_MODULE]: supplier2.id,
          [BrandsModule.linkable.brand]: brandId,
        })

        // Verify both suppliers have the brand
        let response = await api.get(`/admin/suppliers/${supplierId}/brands`)
        expect(response.data.brands.length).toBe(1)
        expect(response.data.brands[0].id).toBe(brandId)

        response = await api.get(`/admin/suppliers/${supplier2.id}/brands`)
        expect(response.data.brands.length).toBe(1)
        expect(response.data.brands[0].id).toBe(brandId)
      })
    })

    describe("Supplier-Brand Query Patterns", () => {
      let supplier2Id: string
      let brand3Id: string

      beforeEach(async () => {
        // Create additional test data
        const supplier2 = await purchasingService.createSuppliers({
          name: "Supplier 2",
          code: "S2",
          email: "supplier2@test.com",
        })
        supplier2Id = supplier2.id

        const brand3 = await brandsService.createBrands({
          name: "Brand 3",
          code: "B3",
          is_oem: true,
        })
        brand3Id = brand3.id

        // Create various supplier-brand relationships
        // Supplier 1 -> Brand 1, Brand 2
        await linkService.create({
          [PURCHASING_MODULE]: supplierId,
          [BrandsModule.linkable.brand]: brandId,
        })
        
        await linkService.create({
          [PURCHASING_MODULE]: supplierId,
          [BrandsModule.linkable.brand]: brand2Id,
        })

        // Supplier 2 -> Brand 2, Brand 3
        await linkService.create({
          [PURCHASING_MODULE]: supplier2Id,
          [BrandsModule.linkable.brand]: brand2Id,
        })
        
        await linkService.create({
          [PURCHASING_MODULE]: supplier2Id,
          [BrandsModule.linkable.brand]: brand3Id,
        })
      })

      it("should query suppliers by brand", async () => {
        // Query using Remote Query to find suppliers for Brand 2
        const queryObj = remoteQueryObjectFromString({
          entryPoint: "supplier_brand",
          fields: ["supplier_id", "brand_id"],
          variables: {
            filters: { brand_id: brand2Id },
            limit: 10,
          },
        })

        const links = await remoteQuery(queryObj)
        
        expect(links.length).toBe(2)  // Both suppliers should be linked to Brand 2
        const supplierIds = links.map((link: any) => link.supplier_id).sort()
        expect(supplierIds).toContain(supplierId)
        expect(supplierIds).toContain(supplier2Id)
      })

      it("should count brands per supplier", async () => {
        // Get brands for supplier 1
        let response = await api.get(`/admin/suppliers/${supplierId}/brands`)
        expect(response.data.brands.length).toBe(2)

        // Get brands for supplier 2
        response = await api.get(`/admin/suppliers/${supplier2Id}/brands`)
        expect(response.data.brands.length).toBe(2)
      })

      it("should filter suppliers by specific brand properties", async () => {
        // Query suppliers that supply OEM brands
        const queryObj = remoteQueryObjectFromString({
          entryPoint: "supplier_brand",
          fields: ["supplier_id", "brand.*"],
          variables: {
            filters: { "brand.is_oem": true },
            limit: 10,
          },
        })

        const links = await remoteQuery(queryObj)
        
        // Should find links for suppliers that have OEM brands
        expect(links.length).toBeGreaterThan(0)
        links.forEach((link: any) => {
          expect(link.brand.is_oem).toBe(true)
        })
      })

      it("should handle supplier with no brand links", async () => {
        // Create a supplier with no brand links
        const supplier3 = await purchasingService.createSuppliers({
          name: "Supplier 3",
          code: "S3",
          email: "supplier3@test.com",
        })

        // Query brands for this supplier
        const response = await api.get(`/admin/suppliers/${supplier3.id}/brands`)
        expect(response.status).toBe(200)
        expect(response.data.brands.length).toBe(0)
      })
    })

    describe("API Error Handling", () => {
      it("should handle invalid supplier ID", async () => {
        const response = await api.get("/admin/suppliers/invalid-id/brands")
        expect(response.status).toBe(404)
      })

      it("should handle invalid brand ID when adding", async () => {
        const response = await api.post(`/admin/suppliers/${supplierId}/brands`, {
          brand_id: "invalid-brand-id",
        })
        expect(response.status).toBe(400)
      })

      it("should handle removing non-existent brand link", async () => {
        const response = await api.delete(`/admin/suppliers/${supplierId}/brands/${brandId}`)
        expect(response.status).toBe(404)
      })

      it("should validate brand_id parameter", async () => {
        const response = await api.post(`/admin/suppliers/${supplierId}/brands`, {
          // Missing brand_id
        })
        expect(response.status).toBe(400)
      })
    })
  },
})