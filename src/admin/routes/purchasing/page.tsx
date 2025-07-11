import { useState, useEffect } from "react"
import { Container, Heading, Button } from "@medusajs/ui"
import { Plus, Users, DocumentText } from "@medusajs/icons"
import { useNavigate } from "react-router-dom"
import { defineRouteConfig } from "@medusajs/admin-sdk"

interface DashboardStats {
  total_suppliers: number
  active_suppliers: number
  total_purchase_orders: number
  pending_orders: number
  recent_orders: any[]
}

export default function PurchasingDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total_suppliers: 0,
    active_suppliers: 0,
    total_purchase_orders: 0,
    pending_orders: 0,
    recent_orders: []
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch suppliers and purchase orders
      const [suppliersRes, ordersRes] = await Promise.all([
        fetch('/admin/suppliers'),
        fetch('/admin/purchase-orders')
      ])
      
      const suppliersData = await suppliersRes.json()
      const ordersData = await ordersRes.json()
      
      const suppliers = suppliersData.suppliers || []
      const orders = ordersData.purchase_orders || []
      
      setStats({
        total_suppliers: suppliers.length,
        active_suppliers: suppliers.filter((s: any) => s.is_active).length,
        total_purchase_orders: orders.length,
        pending_orders: orders.filter((o: any) => ['draft', 'sent', 'confirmed'].includes(o.status)).length,
        recent_orders: orders.slice(0, 5)
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Container className="flex items-center justify-center min-h-96">
        <div>Loading dashboard...</div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Purchasing</Heading>
          <p className="text-gray-500 mt-2">Manage suppliers and purchase orders</p>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Suppliers</p>
                <p className="text-2xl font-bold">{stats.total_suppliers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="p-4 border rounded-lg bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Suppliers</p>
                <p className="text-2xl font-bold">{stats.active_suppliers}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="p-4 border rounded-lg bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Purchase Orders</p>
                <p className="text-2xl font-bold">{stats.total_purchase_orders}</p>
              </div>
              <DocumentText className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          
          <div className="p-4 border rounded-lg bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Orders</p>
                <p className="text-2xl font-bold">{stats.pending_orders}</p>
              </div>
              <DocumentText className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border rounded-lg bg-white">
            <div className="flex items-center justify-between mb-4">
              <Heading level="h3">Suppliers</Heading>
              <Button
                variant="secondary"
                size="small"
                onClick={() => navigate('/admin/suppliers')}
              >
                View All
              </Button>
            </div>
            <p className="text-gray-500 mb-4">
              Manage your supplier database and contact information
            </p>
            <div className="space-y-2">
              <Button
                variant="primary"
                onClick={() => navigate('/admin/suppliers/new')}
                className="w-full"
              >
                <Plus className="mr-2" />
                Add New Supplier
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/admin/suppliers')}
                className="w-full"
              >
                <Users className="mr-2" />
                Manage Suppliers
              </Button>
            </div>
          </div>

          <div className="p-6 border rounded-lg bg-white">
            <div className="flex items-center justify-between mb-4">
              <Heading level="h3">Purchase Orders</Heading>
              <Button
                variant="secondary"
                size="small"
                onClick={() => navigate('/admin/purchase-orders')}
              >
                View All
              </Button>
            </div>
            <p className="text-gray-500 mb-4">
              Create and manage purchase orders for inventory replenishment
            </p>
            <div className="space-y-2">
              <Button
                variant="primary"
                onClick={() => navigate('/admin/purchase-orders/new')}
                className="w-full"
              >
                <Plus className="mr-2" />
                Create Purchase Order
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/admin/purchase-orders')}
                className="w-full"
              >
                <DocumentText className="mr-2" />
                Manage Orders
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Purchasing",
  icon: DocumentText,
}) 