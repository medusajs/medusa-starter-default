import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useState, useEffect, FormEvent } from "react"
import { Button, Input, Select, Textarea, Badge, Heading, Table, Container } from "@medusajs/ui"
import { Wrench } from "@medusajs/icons"

interface Machine {
  id: string
  brand: string
  model: string
  serial_number: string
  year: string
  engine_hours: string | null
  fuel_type: string
  horsepower: string | null
  weight: string | null
  purchase_date: string | null
  purchase_price: string | null
  current_value: string | null
  status: string
  location: string | null
  notes: string | null
  customer_id: string | null
  created_at: string
  updated_at: string
}

const MachinesPage = () => {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [fuelTypeFilter, setFuelTypeFilter] = useState("")
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    serial_number: "",
    year: "",
    engine_hours: "",
    fuel_type: "diesel",
    horsepower: "",
    weight: "",
    purchase_date: "",
    purchase_price: "",
    current_value: "",
    status: "active",
    location: "",
    notes: "",
    customer_id: "",
  })

  useEffect(() => {
    fetchMachines()
  }, [])

  const fetchMachines = async () => {
    try {
      const response = await fetch("/admin/machines")
      const data = await response.json()
      setMachines(data.machines || [])
    } catch (error) {
      console.error("Error fetching machines:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const url = editingMachine ? `/admin/machines/${editingMachine.id}` : "/admin/machines"
      const method = editingMachine ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchMachines()
        resetForm()
      }
    } catch (error) {
      console.error("Error saving machine:", error)
    }
  }

  const handleEdit = (machine: Machine) => {
    setEditingMachine(machine)
    setFormData({
      brand: machine.brand,
      model: machine.model,
      serial_number: machine.serial_number,
      year: machine.year,
      engine_hours: machine.engine_hours || "",
      fuel_type: machine.fuel_type,
      horsepower: machine.horsepower || "",
      weight: machine.weight || "",
      purchase_date: machine.purchase_date || "",
      purchase_price: machine.purchase_price || "",
      current_value: machine.current_value || "",
      status: machine.status,
      location: machine.location || "",
      notes: machine.notes || "",
      customer_id: machine.customer_id || "",
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this machine?")) {
      try {
        await fetch(`/admin/machines/${id}`, { method: "DELETE" })
        fetchMachines()
      } catch (error) {
        console.error("Error deleting machine:", error)
      }
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingMachine(null)
    setFormData({
      brand: "",
      model: "",
      serial_number: "",
      year: "",
      engine_hours: "",
      fuel_type: "diesel",
      horsepower: "",
      weight: "",
      purchase_date: "",
      purchase_price: "",
      current_value: "",
      status: "active",
      location: "",
      notes: "",
      customer_id: "",
    })
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "green",
      maintenance: "orange",
      retired: "grey",
      sold: "blue",
    }
    return (
      <Badge color={colors[status as keyof typeof colors] || "grey"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const filteredMachines = machines.filter((machine) => {
    const matchesSearch = 
      machine.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || machine.status === statusFilter
    const matchesFuelType = !fuelTypeFilter || machine.fuel_type === fuelTypeFilter
    return matchesSearch && matchesStatus && matchesFuelType
  })

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-center p-8">
          <div>Loading machines...</div>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Machine Fleet Management</Heading>
          <p className="text-ui-fg-subtle mt-1">
            Manage your machine inventory ({machines.length} total)
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          + Add Machine
        </Button>
      </div>

      {/* Filters */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Search machines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="retired">Retired</option>
            <option value="sold">Sold</option>
          </Select>
          <Select
            value={fuelTypeFilter}
            onValueChange={setFuelTypeFilter}
          >
            <option value="">All Fuel Types</option>
            <option value="diesel">Diesel</option>
            <option value="petrol">Petrol</option>
            <option value="electric">Electric</option>
            <option value="hybrid">Hybrid</option>
          </Select>
        </div>
      </div>

      {/* Machine List */}
      <div className="px-6 py-4">
        <div className="border rounded-lg">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Brand & Model</Table.HeaderCell>
                <Table.HeaderCell>Serial Number</Table.HeaderCell>
                <Table.HeaderCell>Year</Table.HeaderCell>
                <Table.HeaderCell>Fuel Type</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Location</Table.HeaderCell>
                <Table.HeaderCell>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filteredMachines.map((machine) => (
                <Table.Row key={machine.id}>
                  <Table.Cell>
                    <div>
                      <div className="font-medium">{machine.brand}</div>
                      <div className="text-sm text-ui-fg-subtle">{machine.model}</div>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="font-mono text-sm">
                    {machine.serial_number}
                  </Table.Cell>
                  <Table.Cell>{machine.year}</Table.Cell>
                  <Table.Cell className="capitalize">{machine.fuel_type}</Table.Cell>
                  <Table.Cell>{getStatusBadge(machine.status)}</Table.Cell>
                  <Table.Cell>{machine.location || "—"}</Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-2">
                      <Button 
                        variant="secondary" 
                        size="small"
                        onClick={() => handleEdit(machine)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="danger" 
                        size="small"
                        onClick={() => handleDelete(machine.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
          {filteredMachines.length === 0 && (
            <div className="p-8 text-center text-ui-fg-subtle">
              No machines found matching your criteria.
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <Heading level="h3">
                  {editingMachine ? "Edit Machine" : "Add New Machine"}
                </Heading>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={resetForm}
                >
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  required
                />
                <Input
                  label="Model"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  required
                />
                <Input
                  label="Serial Number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                  required
                />
                <Input
                  label="Year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: e.target.value})}
                  required
                />
                <Input
                  label="Engine Hours"
                  type="number"
                  value={formData.engine_hours}
                  onChange={(e) => setFormData({...formData, engine_hours: e.target.value})}
                />
                <Select 
                  label="Fuel Type"
                  value={formData.fuel_type}
                  onValueChange={(value) => setFormData({...formData, fuel_type: value})}
                >
                  <option value="diesel">Diesel</option>
                  <option value="petrol">Petrol</option>
                  <option value="electric">Electric</option>
                  <option value="hybrid">Hybrid</option>
                </Select>
                <Input
                  label="Horsepower"
                  type="number"
                  value={formData.horsepower}
                  onChange={(e) => setFormData({...formData, horsepower: e.target.value})}
                />
                <Input
                  label="Weight (kg)"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({...formData, weight: e.target.value})}
                />
                <Input
                  label="Purchase Date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                />
                <Input
                  label="Purchase Price"
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({...formData, purchase_price: e.target.value})}
                />
                <Input
                  label="Current Value"
                  type="number"
                  step="0.01"
                  value={formData.current_value}
                  onChange={(e) => setFormData({...formData, current_value: e.target.value})}
                />
                <Select 
                  label="Status"
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                  <option value="sold">Sold</option>
                </Select>
              </div>

              <Input
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
              <Input
                label="Customer ID"
                value={formData.customer_id}
                onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
              />
              <Textarea
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
              />

              <div className="flex gap-2 pt-4">
                <Button type="submit">
                  {editingMachine ? "Update" : "Create"} Machine
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Machines",
  icon: Wrench,
})

export default MachinesPage
