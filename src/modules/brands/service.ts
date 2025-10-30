import { MedusaService } from "@medusajs/framework/utils"
import { InferTypeOf } from "@medusajs/framework/types"
import Brand from "./models/brand"

type BrandType = InferTypeOf<typeof Brand>

class BrandsService extends MedusaService({
  Brand,
}) {
  /**
   * Retrieve a single brand by ID
   * Wrapper around the auto-generated retrieveBrand method
   */
  async retrieve(id: string): Promise<BrandType> {
    return await this.retrieveBrand(id)
  }

  /**
   * List brands with optional filters and pagination
   * Wrapper around the auto-generated listBrands method
   */
  async list(
    filters: Record<string, any> = {},
    config: Record<string, any> = {}
  ): Promise<BrandType[]> {
    return await this.listBrands(filters, config)
  }

  /**
   * Update a single brand by ID
   * Wrapper around the auto-generated updateBrands method
   */
  async update(id: string, data: Partial<BrandType>): Promise<BrandType> {
    const updated = await this.updateBrands([{ id, ...data }])
    return updated[0]
  }

  /**
   * Delete brands by IDs
   * Wrapper around the auto-generated deleteBrands method
   */
  async delete(ids: string[]): Promise<void> {
    await this.deleteBrands(ids)
  }

  /**
   * Search brands by name using text search
   * Returns brands where name contains the search query (case-insensitive)
   */
  async searchBrands(
    query: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<BrandType[]> {
    const { limit = 20, offset = 0 } = options

    // Use listBrands with a text search filter
    // Note: The exact filter syntax depends on your database and ORM configuration
    const brands = await this.listBrands(
      {
        name: {
          $ilike: `%${query}%`,
        },
      },
      {
        take: limit,
        skip: offset,
      }
    )

    return brands
  }

  /**
   * List brands ordered by name (ascending) with optional filters
   * Returns brands sorted alphabetically by name
   */
  async listBrandsOrdered(
    filters: Record<string, any> = {},
    options: { limit?: number; offset?: number } = {}
  ): Promise<BrandType[]> {
    const { limit = 20, offset = 0 } = options

    return await this.listBrands(filters, {
      take: limit,
      skip: offset,
      order: { name: "ASC" },
    })
  }
}

export default BrandsService 