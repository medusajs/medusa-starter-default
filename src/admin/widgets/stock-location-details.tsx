import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useState, useEffect } from "react"
import { Button, Input, Select, Textarea, Badge } from "@medusajs/ui"

interface StockLocationDetail {
  id: string
  stock_location_id: string
  location_code: string
  zone: string | null
  aisle: string | null
  shelf: string | null
  bin: string | null
  is_active: boolean
  metadata: any
}

const StockLocationDetailsWidget = () => {
  const [details, setDetails] = useState<StockLocationDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    stock_location_id: "",
    location_code: "",
    zone: "",
    aisle: "",
    shelf: "",
    bin: "",
    is_active: true
  })

  useEffect(() => {
    fetchDetails()
  }, [])

  const fetchDetails = async () => {
    try {
      const response = await fetch("/admin/stock-location-details")
      const data = await response.json()
      setDetails(data.stock_location_details || [])
    } catch (error) {
      console.error("Error fetching details:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch("/admin/stock-location-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
      
      if (response.ok) {
        setShowForm(false)
        setFormData({
          stock_location_id: "",
          location_code: "",
          zone: "",
          aisle: "",
          shelf: "",
          bin: "",
          is_active: true
        })
        fetchDetails()
      }
    } catch (error) {
      console.error("Error creating detail:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this location detail?")) {
      try {
        await fetch(`/admin/stock-location-details/${id}`, {
          method: "DELETE",
        })
        fetchDetails()
      } catch (error) {
        console.error("Error deleting detail:", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Granular Location Details</h3>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Location Detail"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Stock Location ID</label>
              <Input
                value={formData.stock_location_id}
                onChange={(e) => setFormData({...formData, stock_location_id: e.target.value})}
                placeholder="Enter stock location ID"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location Code</label>
              <Input
                value={formData.location_code}
                onChange={(e) => setFormData({...formData, location_code: e.target.value})}
                placeholder="e.g., A1-B2-S3-01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zone</label>
              <Input
                value={formData.zone}
                onChange={(e) => setFormData({...formData, zone: e.target.value})}
                placeholder="e.g., A1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Aisle</label>
              <Input
                value={formData.aisle}
                onChange={(e) => setFormData({...formData, aisle: e.target.value})}
                placeholder="e.g., B2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Shelf</label>
              <Input
                value={formData.shelf}
                onChange={(e) => setFormData({...formData, shelf: e.target.value})}
                placeholder="e.g., S3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bin</label>
              <Input
                value={formData.bin}
                onChange={(e) => setFormData({...formData, bin: e.target.value})}
                placeholder="e.g., 01"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button type="submit" className="w-full">
              Create Location Detail
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {details.length === 0 ? (
          <p className="text-sm text-gray-500">No location details found. Create one to get started.</p>
        ) : (
          details.map((detail) => (
            <div key={detail.id} className="p-3 border rounded-lg flex justify-between items-center">
              <div>
                <div className="font-medium">{detail.location_code}</div>
                <div className="text-sm text-gray-600">
                  {[detail.zone, detail.aisle, detail.shelf, detail.bin].filter(Boolean).join(" - ")}
                </div>
                <div className="text-xs text-gray-500">Stock Location: {detail.stock_location_id}</div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={detail.is_active ? "success" : "secondary"}>
                  {detail.is_active ? "Active" : "Inactive"}
                </Badge>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => handleDelete(detail.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "stock_location.details.after",
})

export default StockLocationDetailsWidget 