import React, { useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Wrench, Plus, Eye } from "@medusajs/icons"

// Types for our machine data
interface Machine {
  id: string
  brand: string
  model: string
  serial_number: string
  year: string
  engine_hours?: string
  fuel_type: string
  horsepower?: string
  weight?: string
  purchase_date?: string
  purchase_price?: string
  current_value?: string
  status: string
  location?: string
  notes?: string
  customer_id?: string
  created_at: string
  updated_at: string
}

const MachinesPage = () => {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // Fetch machines data
  React.useEffect(() => {
    const fetchMachines = async () => {
      try {
        const response = await fetch('/admin/machines')
        const data = await response.json()
        setMachines(data.machines || [])
      } catch (error) {
        console.error('Error fetching machines:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMachines()
  }, [])

  const handleRowClick = (machine: Machine) => {
    setSelectedMachine(machine)
    setShowDetail(true)
  }

  const handleBackToList = () => {
    setShowDetail(false)
    setSelectedMachine(null)
  }

  if (showDetail && selectedMachine) {
    return <MachineDetail machine={selectedMachine} onBack={handleBackToList} />
  }

  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "24px" 
      }}>
        <div>
          <h1 style={{ 
            fontSize: "24px", 
            fontWeight: "600", 
            margin: "0 0 8px 0" 
          }}>
            Machines
          </h1>
          <p style={{ 
            color: "#6B7280", 
            margin: "0" 
          }}>
            Manage your machine fleet
          </p>
        </div>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#3B82F6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500"
          }}
        >
          <Plus size={16} />
          Add Machine
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "200px" 
        }}>
          <div>Loading machines...</div>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div style={{ 
          backgroundColor: "white", 
          borderRadius: "8px", 
          border: "1px solid #E5E7EB",
          overflow: "hidden" 
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "#F9FAFB" }}>
              <tr>
                <th style={tableHeaderStyle}>Brand</th>
                <th style={tableHeaderStyle}>Model</th>
                <th style={tableHeaderStyle}>Serial Number</th>
                <th style={tableHeaderStyle}>Year</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={tableHeaderStyle}>Location</th>
                <th style={tableHeaderStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {machines.length === 0 ? (
                <tr>
                  <td 
                    colSpan={7} 
                    style={{ 
                      padding: "48px", 
                      textAlign: "center", 
                      color: "#6B7280" 
                    }}
                  >
                    No machines found
                  </td>
                </tr>
              ) : (
                machines.map((machine) => (
                  <tr 
                    key={machine.id}
                    style={{ 
                      borderBottom: "1px solid #E5E7EB",
                      cursor: "pointer"
                    }}
                    onClick={() => handleRowClick(machine)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#F9FAFB"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }}
                  >
                    <td style={tableCellStyle}>{machine.brand}</td>
                    <td style={tableCellStyle}>{machine.model}</td>
                    <td style={tableCellStyle}>{machine.serial_number}</td>
                    <td style={tableCellStyle}>{machine.year}</td>
                    <td style={tableCellStyle}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500",
                        backgroundColor: machine.status === "active" ? "#DCFCE7" : "#FEF3C7",
                        color: machine.status === "active" ? "#166534" : "#92400E"
                      }}>
                        {machine.status}
                      </span>
                    </td>
                    <td style={tableCellStyle}>{machine.location || "-"}</td>
                    <td style={tableCellStyle}>
                      <button
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          backgroundColor: "transparent",
                          border: "1px solid #D1D5DB",
                          borderRadius: "4px",
                          padding: "4px 8px",
                          cursor: "pointer",
                          fontSize: "12px"
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRowClick(machine)
                        }}
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Machine Detail Component
const MachineDetail = ({ machine, onBack }: { machine: Machine; onBack: () => void }) => {
  return (
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "transparent",
            border: "1px solid #D1D5DB",
            borderRadius: "6px",
            padding: "8px 12px",
            cursor: "pointer",
            fontSize: "14px",
            marginBottom: "16px"
          }}
        >
          ← Back to Machines
        </button>
        <h1 style={{ 
          fontSize: "24px", 
          fontWeight: "600", 
          margin: "0 0 8px 0" 
        }}>
          {machine.brand} {machine.model}
        </h1>
        <p style={{ 
          color: "#6B7280", 
          margin: "0" 
        }}>
          Serial: {machine.serial_number}
        </p>
      </div>

      {/* Machine Details */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr", 
        gap: "24px" 
      }}>
        {/* Basic Information */}
        <div style={{ 
          backgroundColor: "white", 
          padding: "24px", 
          borderRadius: "8px", 
          border: "1px solid #E5E7EB" 
        }}>
          <h3 style={{ 
            fontSize: "18px", 
            fontWeight: "600", 
            marginBottom: "16px" 
          }}>
            Basic Information
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <DetailRow label="Brand" value={machine.brand} />
            <DetailRow label="Model" value={machine.model} />
            <DetailRow label="Serial Number" value={machine.serial_number} />
            <DetailRow label="Year" value={machine.year} />
            <DetailRow label="Status" value={machine.status} />
            <DetailRow label="Fuel Type" value={machine.fuel_type} />
          </div>
        </div>

        {/* Technical Specifications */}
        <div style={{ 
          backgroundColor: "white", 
          padding: "24px", 
          borderRadius: "8px", 
          border: "1px solid #E5E7EB" 
        }}>
          <h3 style={{ 
            fontSize: "18px", 
            fontWeight: "600", 
            marginBottom: "16px" 
          }}>
            Technical Specifications
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <DetailRow label="Engine Hours" value={machine.engine_hours || "-"} />
            <DetailRow label="Horsepower" value={machine.horsepower || "-"} />
            <DetailRow label="Weight" value={machine.weight || "-"} />
            <DetailRow label="Location" value={machine.location || "-"} />
          </div>
        </div>

        {/* Financial Information */}
        <div style={{ 
          backgroundColor: "white", 
          padding: "24px", 
          borderRadius: "8px", 
          border: "1px solid #E5E7EB" 
        }}>
          <h3 style={{ 
            fontSize: "18px", 
            fontWeight: "600", 
            marginBottom: "16px" 
          }}>
            Financial Information
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <DetailRow label="Purchase Date" value={machine.purchase_date || "-"} />
            <DetailRow label="Purchase Price" value={machine.purchase_price || "-"} />
            <DetailRow label="Current Value" value={machine.current_value || "-"} />
          </div>
        </div>

        {/* Additional Information */}
        <div style={{ 
          backgroundColor: "white", 
          padding: "24px", 
          borderRadius: "8px", 
          border: "1px solid #E5E7EB" 
        }}>
          <h3 style={{ 
            fontSize: "18px", 
            fontWeight: "600", 
            marginBottom: "16px" 
          }}>
            Additional Information
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <DetailRow label="Customer ID" value={machine.customer_id || "-"} />
            <DetailRow label="Created" value={new Date(machine.created_at).toLocaleDateString()} />
            <DetailRow label="Updated" value={new Date(machine.updated_at).toLocaleDateString()} />
          </div>
          {machine.notes && (
            <div style={{ marginTop: "16px" }}>
              <label style={{ 
                fontSize: "14px", 
                fontWeight: "500", 
                color: "#374151" 
              }}>
                Notes
              </label>
              <p style={{ 
                marginTop: "4px", 
                fontSize: "14px", 
                color: "#6B7280" 
              }}>
                {machine.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper component for detail rows
const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <label style={{ 
      fontSize: "14px", 
      fontWeight: "500", 
      color: "#374151" 
    }}>
      {label}
    </label>
    <p style={{ 
      marginTop: "2px", 
      fontSize: "14px", 
      color: "#6B7280" 
    }}>
      {value}
    </p>
  </div>
)

// Styles
const tableHeaderStyle: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "left",
  fontSize: "12px",
  fontWeight: "600",
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: "0.05em"
}

const tableCellStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: "14px",
  color: "#374151"
}

export const config = defineRouteConfig({
  label: "Machines",
  path: "/machines",
  icon: Wrench,
})

export default MachinesPage
