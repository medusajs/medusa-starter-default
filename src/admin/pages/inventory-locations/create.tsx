import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Input, Textarea, Switch, Label } from "@medusajs/ui"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

const CreateInventoryLocationPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    warehouse_id: "",
    description: "",
    is_active: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/admin/inventory-locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        navigate("/admin/inventory-locations")
      } else {
        console.error("Error creating location")
      }
    } catch (error) {
      console.error("Error creating location:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Container>
      <div className="mb-6">
        <Heading level="h1">Create Inventory Location</Heading>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div>
          <Label htmlFor="name">Location Name *</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="e.g. Aisle 3, Bin B2"
            required
          />
        </div>

        <div>
          <Label htmlFor="warehouse_id">Warehouse ID</Label>
          <Input
            id="warehouse_id"
            type="text"
            value={formData.warehouse_id}
            onChange={(e) => handleChange("warehouse_id", e.target.value)}
            placeholder="Optional warehouse identifier"
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Additional details about this location"
            rows={3}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => handleChange("is_active", checked)}
          />
          <Label htmlFor="is_active">Active Location</Label>
        </div>

        <div className="flex space-x-4">
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !formData.name}
          >
            {loading ? "Creating..." : "Create Location"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/admin/inventory-locations")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Create Location",
})

export default CreateInventoryLocationPage 