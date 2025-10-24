import { useQuery } from "@tanstack/react-query"

/**
 * Shared hook to fetch customers for service orders
 * Prevents duplicate queries across kanban and table views
 *
 * @returns Query result with customers array and count
 */
export const useCustomers = () => {
  return useQuery({
    queryKey: ["service-orders-customers"],
    queryFn: async () => {
      const response = await fetch(`/admin/customers?limit=1000`)
      if (!response.ok) throw new Error("Failed to fetch customers")
      const data = await response.json()
      return {
        customers: data.customers || [],
        count: data.count || 0
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - customers don't change frequently
  })
}

/**
 * Shared hook to fetch technicians for service orders
 * Prevents duplicate queries across kanban and table views
 *
 * @returns Query result with technicians array and count
 */
export const useTechnicians = () => {
  return useQuery({
    queryKey: ["service-orders-technicians"],
    queryFn: async () => {
      const response = await fetch(`/admin/technicians?limit=1000`)
      if (!response.ok) throw new Error("Failed to fetch technicians")
      const data = await response.json()
      return {
        technicians: data.technicians || [],
        count: data.count || 0
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - technicians don't change frequently
  })
}

/**
 * Create lookup map for customers
 * Optimizes repeated lookups by ID
 *
 * @param customers - Array of customer objects
 * @returns Map of customer ID to customer object
 */
export const createCustomerLookup = (customers: any[]) => {
  const map = new Map()
  if (Array.isArray(customers)) {
    customers.forEach((customer: any) => {
      map.set(customer.id, customer)
    })
  }
  return map
}

/**
 * Create lookup map for technicians
 * Optimizes repeated lookups by ID
 *
 * @param technicians - Array of technician objects
 * @returns Map of technician ID to technician object
 */
export const createTechnicianLookup = (technicians: any[]) => {
  const map = new Map()
  if (Array.isArray(technicians)) {
    technicians.forEach((technician: any) => {
      map.set(technician.id, technician)
    })
  }
  return map
}
