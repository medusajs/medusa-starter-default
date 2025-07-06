import { MedusaService } from "@medusajs/framework/utils"
import Brand from "./models/brand"

class BrandsService extends MedusaService({
  Brand,
}) {
  
  // Create a new brand
  async createBrand(data: any) {
    return await this.create(data)
  }

  // Retrieve a brand by ID
  async retrieveBrand(id: string) {
    return await this.retrieve(id)
  }

  // Retrieve a brand by code
  async retrieveBrandByCode(code: string) {
    const [brand] = await this.list({ code })
    return brand
  }

  // Update a brand
  async updateBrand(id: string, data: any) {
    return await this.update(id, data)
  }

  // Delete a brand
  async deleteBrand(id: string) {
    return await this.delete(id)
  }

  // List brands with filters and pagination
  async listBrands(filters: any = {}, config: any = {}) {
    return await this.list(filters, config)
  }

  // List and count brands with filters and pagination
  async listAndCountBrands(filters: any = {}, config: any = {}) {
    return await this.listAndCount(filters, config)
  }

  // Get active brands only
  async listActiveBrands(filters: any = {}, config: any = {}) {
    return await this.list({ ...filters, is_active: true }, config)
  }

  // Get OEM brands only
  async listOEMBrands(filters: any = {}, config: any = {}) {
    return await this.list({ ...filters, is_oem: true, is_active: true }, config)
  }

  // Get authorized dealer brands
  async listAuthorizedBrands(filters: any = {}, config: any = {}) {
    return await this.list({ ...filters, authorized_dealer: true, is_active: true }, config)
  }

  // Search brands by name or code
  async searchBrands(searchTerm: string, config: any = {}) {
    const brands = await this.list({}, config)
    return brands.filter(brand => 
      brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  // Get brands ordered by display order
  async listBrandsOrdered(filters: any = {}, config: any = {}) {
    return await this.list(filters, {
      ...config,
      order: { display_order: "ASC", name: "ASC" }
    })
  }

  // Count brands with filters
  async countBrands(filters: any = {}) {
    const [, count] = await this.listAndCount(filters)
    return count
  }

  // Check if brand code is unique
  async isBrandCodeUnique(code: string, excludeId?: string) {
    const filters: any = { code }
    if (excludeId) {
      filters.id = { $ne: excludeId }
    }
    const count = await this.countBrands(filters)
    return count === 0
  }

  // Activate/Deactivate brand
  async toggleBrandStatus(id: string) {
    const brand = await this.retrieveBrand(id)
    return await this.updateBrand(id, { is_active: !brand.is_active })
  }
}

export default BrandsService 