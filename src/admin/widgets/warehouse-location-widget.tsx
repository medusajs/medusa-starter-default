import { defineWidgetConfig } from "@medusajs/admin-sdk"

const WarehouseLocationWidget = () => {
  return (
    <div className="bg-white border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Warehouse Bin Locations
        </h3>
        <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
          Manage Locations
        </button>
      </div>
      
      <div className="text-sm text-gray-600 mb-4">
        Gebruik specifieke warehouse bin locaties in plaats van algemene filialen voor nauwkeurige voorraadtracking.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded border">
          <div className="font-medium text-gray-900">Aisle 1, Bin A1</div>
          <div className="text-sm text-gray-600">Hydraulic Parts</div>
          <div className="text-xs text-green-600 mt-1">Active • MAIN-WH</div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded border">
          <div className="font-medium text-gray-900">Aisle 2, Bin B2</div>
          <div className="text-sm text-gray-600">Electrical Components</div>
          <div className="text-xs text-green-600 mt-1">Active • MAIN-WH</div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded border">
          <div className="font-medium text-gray-900">Outside Storage</div>
          <div className="text-sm text-gray-600">Large Parts</div>
          <div className="text-xs text-green-600 mt-1">Active • MAIN-WH</div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <button className="text-blue-600 hover:text-blue-800 text-sm">
          View All Warehouse Locations →
        </button>
      </div>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "inventory.list.before",
})

export default WarehouseLocationWidget 