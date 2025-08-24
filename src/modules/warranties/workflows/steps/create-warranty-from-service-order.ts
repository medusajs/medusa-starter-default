import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { WARRANTIES_MODULE } from "../.."
import { SERVICE_ORDERS_MODULE } from "../../../service-orders"
import { ConvertServiceOrderToWarrantyInput } from "../../types"

export const createWarrantyFromServiceOrderStep = createStep(
  "create-warranty-from-service-order",
  async (input: ConvertServiceOrderToWarrantyInput, { container }) => {
    const warrantiesService = container.resolve(WARRANTIES_MODULE)
    const serviceOrdersService = container.resolve(SERVICE_ORDERS_MODULE)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    
    // Fetch service order with full details
    const serviceOrder = await serviceOrdersService.retrieveServiceOrder(input.service_order_id, {
      relations: ["items", "time_entries"]
    })
    
    if (!serviceOrder) {
      throw new Error(`Service Order ${input.service_order_id} not found`)
    }
    
    // Validate that this is a warranty service order
    if (serviceOrder.service_type !== "warranty") {
      throw new Error(`Service Order ${input.service_order_id} is not a warranty service order`)
    }
    
    // Get customer details via Remote Query if customer_id exists
    let customer: any | undefined = undefined
    if (serviceOrder.customer_id) {
      const { data: [customerData] } = await query.graph({
        entity: "customer", 
        fields: [
          "id",
          "first_name",
          "last_name", 
          "email",
          "phone",
          "addresses.*",
        ],
        filters: {
          id: serviceOrder.customer_id,
        },
      })
      customer = customerData
    }
    
    // Use primary address or create a basic one
    const billingAddress = customer?.addresses?.[0] || {
      first_name: customer?.first_name || "",
      last_name: customer?.last_name || "",
      company: "",
      address_1: "",
      city: "",
      postal_code: "",
      country_code: "BE", // Belgium default
    }
    
    // Create the warranty
    const warranty = await warrantiesService.createWarrantyWithNumber({
      service_order_id: serviceOrder.id,
      customer_id: serviceOrder.customer_id,
      machine_id: serviceOrder.machine_id,
      warranty_type: input.warranty_type || "manufacturer",
      warranty_claim_number: input.warranty_claim_number || serviceOrder.warranty_claim_number,
      warranty_provider: input.warranty_provider,
      description: serviceOrder.description ?? undefined,
      failure_description: serviceOrder.customer_complaint ?? undefined,
      repair_description: serviceOrder.work_performed ?? undefined,
      notes: input.notes ?? undefined,
      labor_cost: serviceOrder.total_labor_cost,
      parts_cost: serviceOrder.total_parts_cost,
      total_cost: serviceOrder.total_cost,
      billing_address_line_1: billingAddress.address_1,
      billing_address_line_2: billingAddress.address_2 ?? undefined,
      billing_city: billingAddress.city,
      billing_postal_code: billingAddress.postal_code,
      billing_country: billingAddress.country_code,
      service_address_line_1: serviceOrder.service_address_line_1,
      service_address_line_2: serviceOrder.service_address_line_2 ?? undefined,
      service_city: serviceOrder.service_city,
      service_postal_code: serviceOrder.service_postal_code,
      service_country: serviceOrder.service_country,
      created_by: input.created_by,
    })
    
    // Add labor costs from time entries
    if (serviceOrder.time_entries?.length > 0) {
      for (const timeEntry of serviceOrder.time_entries) {
        const hours = timeEntry.billable_hours || timeEntry.duration_minutes / 60
        const rate = timeEntry.hourly_rate || serviceOrder.labor_rate || 0
        
        if (hours > 0 && rate > 0) {
          await warrantiesService.addLineItemToWarranty({
            warranty_id: warranty.id,
            item_type: "labor",
            service_order_id: serviceOrder.id,
            service_order_time_entry_id: timeEntry.id,
            title: `Labor - ${timeEntry.work_description || "Service Work"}`,
            description: `Work Category: ${timeEntry.work_category || "General"}`,
            quantity: 1,
            unit_price: timeEntry.total_cost || (hours * rate),
            hours_worked: hours,
            hourly_rate: rate,
          })
        }
      }
    } else if (serviceOrder.total_labor_cost > 0) {
      // Fallback to service order level labor costs
      await warrantiesService.addLineItemToWarranty({
        warranty_id: warranty.id,
        item_type: "labor",
        service_order_id: serviceOrder.id,
        title: `Labor - ${serviceOrder.description}`,
        description: serviceOrder.work_performed || serviceOrder.diagnosis || "Service work performed",
        quantity: 1,
        unit_price: serviceOrder.total_labor_cost,
        hours_worked: serviceOrder.actual_hours,
        hourly_rate: serviceOrder.labor_rate,
      })
    }
    
    // Add parts/items used
    if (serviceOrder.items?.length > 0) {
      for (const item of serviceOrder.items) {
        if (item.quantity_used > 0) {
          await warrantiesService.addLineItemToWarranty({
            warranty_id: warranty.id,
            item_type: "product",
            service_order_id: serviceOrder.id,
            service_order_item_id: item.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            title: item.title,
            description: item.description,
            sku: item.sku,
            quantity: item.quantity_used,
            unit_price: item.unit_price,
          })
        }
      }
    }
    
    return new StepResponse(warranty, warranty.id)
  },
  async (warrantyId: string, { container }) => {
    // Compensation: delete the created warranty if workflow fails
    if (!warrantyId) return
    
    const warrantiesService = container.resolve(WARRANTIES_MODULE)
    await warrantiesService.deleteWarranties([warrantyId])
  }
) 