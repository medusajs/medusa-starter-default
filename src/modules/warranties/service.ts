import { MedusaService } from "@medusajs/framework/utils"
import Warranty, { WarrantyStatus, WarrantyType } from "./models/warranty"
import WarrantyLineItem, { WarrantyLineItemType } from "./models/warranty-line-item"
import WarrantyStatusHistory from "./models/warranty-status-history"
import { 
  CreateWarrantyDTO, 
  CreateWarrantyLineItemDTO,
  CreateWarrantyStatusHistoryDTO 
} from "./types"

type CreateWarrantyInput = {
  service_order_id: string
  customer_id?: string | null
  machine_id?: string | null
  warranty_type?: "manufacturer" | "supplier" | "extended" | "goodwill"
  warranty_claim_number?: string | null
  warranty_provider?: string | null
  claim_reference?: string | null
  labor_cost?: number
  parts_cost?: number
  total_cost?: number
  warranty_start_date?: Date | null
  warranty_end_date?: Date | null
  description?: string | null
  failure_description?: string | null
  repair_description?: string | null
  notes?: string | null
  internal_notes?: string | null
  created_by?: string | null
  metadata?: Record<string, any> | null
}

type CreateWarrantyLineItemInput = {
  warranty_id: string
  item_type?: "labor" | "product" | "shipping" | "adjustment"
  title: string
  description?: string | null
  sku?: string | null
  quantity?: number
  unit_price?: number
  product_id?: string | null
  variant_id?: string | null
  service_order_id?: string | null
  service_order_item_id?: string | null
  service_order_time_entry_id?: string | null
  hours_worked?: number | null
  hourly_rate?: number | null
  is_reimbursable?: boolean
  metadata?: Record<string, any> | null
}

class WarrantiesService extends MedusaService({
  Warranty,
  WarrantyLineItem,
  WarrantyStatusHistory,
}) {
  
  async generateWarrantyNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `WAR-${year}-`
    
    // Get count of warranties for this year to generate sequential number
    const existingWarranties = await this.listWarranties({})
    const currentYearCount = existingWarranties.filter(w => 
      w.warranty_number?.startsWith(prefix)
    ).length
    
    const sequenceNumber = String(currentYearCount + 1).padStart(3, '0')
    return `${prefix}${sequenceNumber}`
  }

  async createWarrantyWithNumber(data: CreateWarrantyInput) {
    const warrantyNumber = await this.generateWarrantyNumber()
    
    const warranty = await this.createWarranties({
      warranty_number: warrantyNumber,
      service_order_id: data.service_order_id,
      customer_id: data.customer_id,
      machine_id: data.machine_id,
      warranty_type: data.warranty_type || WarrantyType.MANUFACTURER,
      status: WarrantyStatus.DRAFT,
      warranty_claim_number: data.warranty_claim_number,
      warranty_provider: data.warranty_provider,
      claim_reference: data.claim_reference,
      labor_cost: data.labor_cost || 0,
      parts_cost: data.parts_cost || 0,
      total_cost: data.total_cost || 0,
      reimbursement_amount: 0,
      currency_code: "EUR",
      warranty_start_date: data.warranty_start_date,
      warranty_end_date: data.warranty_end_date,
      billing_country: "BE",
      service_country: "BE",
      description: data.description,
      failure_description: data.failure_description,
      repair_description: data.repair_description,
      notes: data.notes,
      internal_notes: data.internal_notes,
      created_by: data.created_by,
      metadata: data.metadata,
    })

    // Create initial status history entry
    await this.createWarrantyStatusHistories({
      warranty_id: warranty.id,
      from_status: null,
      to_status: warranty.status,
      changed_by: data.created_by,
      change_reason: "Warranty created",
    })

    return warranty
  }

  async addLineItemToWarranty(data: CreateWarrantyLineItemInput) {
    // Calculate total amount
    const quantity = data.quantity || 1
    const unitPrice = data.unit_price || 0
    const totalAmount = quantity * unitPrice
    const taxAmount = totalAmount * 0.21 // Belgium VAT

    const lineItem = await this.createWarrantyLineItems({
      warranty_id: data.warranty_id,
      item_type: data.item_type || WarrantyLineItemType.LABOR,
      title: data.title,
      description: data.description,
      sku: data.sku,
      quantity: quantity,
      unit_price: unitPrice,
      total_amount: totalAmount,
      product_id: data.product_id,
      variant_id: data.variant_id,
      service_order_id: data.service_order_id,
      service_order_item_id: data.service_order_item_id,
      service_order_time_entry_id: data.service_order_time_entry_id,
      hours_worked: data.hours_worked,
      hourly_rate: data.hourly_rate,
      tax_rate: 0.21,
      tax_amount: taxAmount,
      is_reimbursable: data.is_reimbursable ?? true,
      reimbursement_amount: 0,
      metadata: data.metadata,
    })

    // Recalculate warranty totals
    await this.recalculateWarrantyTotals(data.warranty_id)
    
    return lineItem
  }

  async changeWarrantyStatus(
    warrantyId: string,
    newStatus: "draft" | "submitted" | "approved" | "reimbursed" | "rejected" | "closed",
    data: {
      changed_by?: string
      change_reason?: string
      notes?: string
      external_reference?: string
      approval_number?: string
    } = {}
  ) {
    const warranties = await this.listWarranties({ id: warrantyId })
    const warranty = warranties[0]
    
    if (!warranty) {
      throw new Error(`Warranty ${warrantyId} not found`)
    }

    const oldStatus = warranty.status
    
    // Update warranty status with appropriate dates
    const updateData: any = { 
      status: newStatus,
    }
    
    if (newStatus === "approved") {
      updateData.approval_date = new Date()
    } else if (newStatus === "reimbursed") {
      updateData.reimbursement_date = new Date()
    } else if (newStatus === "submitted" && !warranty.claim_date) {
      updateData.claim_date = new Date()
    }
    
    const updatedWarranty = await this.updateWarranties(updateData, { id: warrantyId })

    // Create status history entry
    await this.createWarrantyStatusHistories({
      warranty_id: warrantyId,
      from_status: oldStatus as any,
      to_status: newStatus as any,
      changed_by: data.changed_by,
      change_reason: data.change_reason,
      notes: data.notes,
      external_reference: data.external_reference,
      approval_number: data.approval_number,
    })

    return updatedWarranty
  }

  async recalculateWarrantyTotals(warrantyId: string) {
    const lineItems = await this.listWarrantyLineItems({ warranty_id: warrantyId })
    
    let laborCost = 0
    let partsCost = 0
    let totalCost = 0
    
    for (const item of lineItems) {
      const itemTotal = item.total_amount || 0
      totalCost += itemTotal
      
      if (item.item_type === WarrantyLineItemType.LABOR) {
        laborCost += itemTotal
      } else if (item.item_type === WarrantyLineItemType.PRODUCT) {
        partsCost += itemTotal
      }
    }
    
    return await this.updateWarranties({
      labor_cost: laborCost,
      parts_cost: partsCost,
      total_cost: totalCost,
    }, { id: warrantyId })
  }

  async getWarrantiesByServiceOrder(serviceOrderId: string) {
    return await this.listWarranties({ service_order_id: serviceOrderId })
  }

  async getWarrantiesByCustomer(customerId: string) {
    return await this.listWarranties({ customer_id: customerId })
  }

  async getWarrantiesByMachine(machineId: string) {
    return await this.listWarranties({ machine_id: machineId })
  }
}

export default WarrantiesService 