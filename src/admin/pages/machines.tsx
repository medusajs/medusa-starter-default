import { useState, useEffect } from "react"
import { Button, Input, Select, Textarea, Badge, Checkbox, Heading } from "@medusajs/ui"

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
  const [selectedMachines, setSelectedMachines] = useState<string[]>([])
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
    customer_id: ""
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingMachine 
        ? `/admin/machines/${editingMachine.id}`
        : "/admin/machines"
      
      const method = editingMachine ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
      
      if (response.ok) {
        setShowForm(false)
        setEditingMachine(null)
        resetForm()
        fetchMachines()
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
      customer_id: machine.customer_id || ""
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this machine?")) {
      try {
        await fetch(`/admin/machines/${id}`, {
          method: "DELETE",
        })
        fetchMachines()
      } catch (error) {
        console.error("Error deleting machine:", error)
      }
    }
  }

  const resetForm = () => {
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
      customer_id: ""
    })
  }

  const handleBulkAction = async (action: string) => {
    if (selectedMachines.length === 0) return
    
    try {
      for (const id of selectedMachines) {
        if (action === "delete") {
          await fetch(`/admin/machines/${id}`, { method: "DELETE" })
        } else if (action === "activate") {
          await fetch(`/admin/machines/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "active" })
          })
        } else if (action === "maintenance") {
          await fetch(`/admin/machines/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "maintenance" })
          })
        }
      }
      setSelectedMachines([])
      fetchMachines()
    } catch (error) {
      console.error("Error performing bulk action:", error)
    }
  }

  const filteredMachines = machines.filter(machine => {
    const matchesSearch = 
      machine.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = !statusFilter || machine.status === statusFilter
    const matchesFuelType = !fuelTypeFilter || machine.fuel_type === fuelTypeFilter
    
    return matchesSearch && matchesStatus && matchesFuelType
  })

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active": return "success"
      case "maintenance": return "warning"
      case "retired": return "secondary"
      case "sold": return "danger"
      default: return "secondary"
    }
  }

  const getFuelTypeBadgeVariant = (fuelType: string) => {
    switch (fuelType) {
      case "diesel": return "default"
      case "petrol": return "default"
      case "electric": return "success"
      case "hybrid": return "warning"
      default: return "secondary"
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading machines...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Heading level="h1">Machines Management</Heading>
        <Button onClick={() => {
          setShowForm(!showForm)
          if (!showForm) {
            setEditingMachine(null)
            resetForm()
          }
        }}>
          {showForm ? "Cancel" : "Add Machine"}
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <Input
              placeholder="Brand, model, or serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
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
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fuel Type</label>
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
          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() => {
                setSearchTerm("")
                setStatusFilter("")
                setFuelTypeFilter("")
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedMachines.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              {selectedMachines.length} machine(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="small"
                onClick={() => handleBulkAction("activate")}
              >
                Activate
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => handleBulkAction("maintenance")}
              >
                Set Maintenance
              </Button>
              <Button
                variant="danger"
                size="small"
                onClick={() => handleBulkAction("delete")}
              >
                Delete
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setSelectedMachines([])}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-6 border rounded-lg bg-gray-50">
          <Heading level="h2" className="mb-4">
            {editingMachine ? "Edit Machine" : "Add New Machine"}
          </Heading>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Brand *</label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  placeholder="e.g., Caterpillar"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model *</label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  placeholder="e.g., 320D"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Serial Number *</label>
                <Input
                  value={formData.serial_number}
                  onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                  placeholder="e.g., CAT0320D123456"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <Input
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: e.target.value})}
                  placeholder="e.g., 2020"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Engine Hours</label>
                <Input
                  value={formData.engine_hours}
                  onChange={(e) => setFormData({...formData, engine_hours: e.target.value})}
                  placeholder="e.g., 2500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fuel Type</label>
                <Select
                  value={formData.fuel_type}
                  onValueChange={(value) => setFormData({...formData, fuel_type: value})}
                >
                  <option value="diesel">Diesel</option>
                  <option value="petrol">Petrol</option>
                  <option value="electric">Electric</option>
                  <option value="hybrid">Hybrid</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Horsepower</label>
                <Input
                  value={formData.horsepower}
                  onChange={(e) => setFormData({...formData, horsepower: e.target.value})}
                  placeholder="e.g., 150"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                <Input
                  value={formData.weight}
                  onChange={(e) => setFormData({...formData, weight: e.target.value})}
                  placeholder="e.g., 20000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Date</label>
                <Input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Price</label>
                <Input
                  value={formData.purchase_price}
                  onChange={(e) => setFormData({...formData, purchase_price: e.target.value})}
                  placeholder="e.g., 150000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Value</label>
                <Input
                  value={formData.current_value}
                  onChange={(e) => setFormData({...formData, current_value: e.target.value})}
                  placeholder="e.g., 120000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                  <option value="sold">Sold</option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g., Warehouse A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Customer ID</label>
                <Input
                  value={formData.customer_id}
                  onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                  placeholder="e.g., cust_123"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes about the machine..."
                rows={3}
              />
            </div>
            <div className="mt-6 flex gap-2">
              <Button type="submit">
                {editingMachine ? "Update Machine" : "Create Machine"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false)
                  setEditingMachine(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Machines List */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <Heading level="h3">Machines ({filteredMachines.length})</Heading>
        </div>
        <div className="divide-y">
          {filteredMachines.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No machines found. Create one to get started.</p>
            </div>
          ) : (
            filteredMachines.map((machine) => (
              <div key={machine.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      checked={selectedMachines.includes(machine.id)}
                      onChange={(checked) => {
                        if (checked) {
                          setSelectedMachines([...selectedMachines, machine.id])
                        } else {
                          setSelectedMachines(selectedMachines.filter(id => id !== machine.id))
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-lg">
                          {machine.brand} {machine.model}
                        </h4>
                        <Badge variant={getStatusBadgeVariant(machine.status)}>
                          {machine.status}
                        </Badge>
                        <Badge variant={getFuelTypeBadgeVariant(machine.fuel_type)}>
                          {machine.fuel_type}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        Serial: {machine.serial_number} | Year: {machine.year}
                      </div>
                      <div className="text-sm text-gray-500">
                        {machine.engine_hours && `Engine Hours: ${machine.engine_hours} | `}
                        {machine.horsepower && `HP: ${machine.horsepower} | `}
                        {machine.weight && `Weight: ${machine.weight}kg | `}
                        {machine.location && `Location: ${machine.location} | `}
                        {machine.customer_id && `Customer: ${machine.customer_id}`}
                      </div>
                      {machine.notes && (
                        <div className="text-sm text-gray-500 mt-1">
                          Notes: {machine.notes}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Created: {new Date(machine.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default MachinesPage 