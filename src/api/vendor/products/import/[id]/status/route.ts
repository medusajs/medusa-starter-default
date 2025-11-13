import type { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'
import { importStatusCache } from '../../import-cache'

/**
 * GET /vendor/products/import/:id/status
 * 
 * Check the status of an import
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { id: transactionId } = req.params
    const sellerId = req.auth_context?.actor_id

    if (!sellerId) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        'Seller authentication required'
      )
    }

    const status = importStatusCache.get(transactionId)

    if (!status) {
      res.status(404).json({
        success: false,
        error: 'Import status not found. The import may have expired or not started yet.'
      })
      return
    }

    res.status(200).json({
      success: true,
      status: status.status,
      summary: status.summary,
      error: status.error,
      completedAt: status.completedAt
    })

  } catch (error: any) {
    console.error('❌ Status check failed:', error)
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to check import status'
    })
  }
}

