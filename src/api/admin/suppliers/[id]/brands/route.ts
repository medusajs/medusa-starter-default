import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, remoteQueryObjectFromString } from "@medusajs/framework/utils"
import BrandsModule, { BRANDS_MODULE } from "../../../../../modules/brands"
import PurchasingModule, { PURCHASING_MODULE } from "../../../../../modules/purchasing"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    if (!id) {
      return res.status(400).json({ message: "supplier id is required" })
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

    const queryObj = remoteQueryObjectFromString({
      entryPoint: "supplier",
      fields: [
        "id",
        "brands.*",
        // counts (optional): derive on client or extend here via joins if needed
      ],
      variables: {
        filters: { id },
        limit: 1,
      },
    })

    const [supplier] = await query(queryObj)

    return res.json({ brands: supplier?.brands ?? [] })
  } catch (e: any) {
    return res.status(500).json({ message: e.message || "Failed to fetch supplier brands" })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const { brand_id } = req.body as { brand_id: string }
    if (!id || !brand_id) {
      return res.status(400).json({ message: "supplier id and brand_id are required" })
    }

    const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

    await link.create({
      linkDefinition: {
        left: {
          linkable: PurchasingModule.linkable.supplier,
        },
        right: {
          linkable: BrandsModule.linkable.brand,
        },
      },
      data: [{ id, brand_id } as any],
    } as any)

    return res.status(204).send()
  } catch (e: any) {
    return res.status(500).json({ message: e.message || "Failed to link brand to supplier" })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { id } = req.params
    const { brand_id } = req.query as any
    if (!id || !brand_id) {
      return res.status(400).json({ message: "supplier id and brand_id are required" })
    }

    const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

    await link.delete({
      linkDefinition: {
        left: {
          linkable: PurchasingModule.linkable.supplier,
        },
        right: {
          linkable: BrandsModule.linkable.brand,
        },
      },
      data: [{ id, brand_id } as any],
    } as any)

    return res.status(204).send()
  } catch (e: any) {
    return res.status(500).json({ message: e.message || "Failed to unlink brand from supplier" })
  }
}


