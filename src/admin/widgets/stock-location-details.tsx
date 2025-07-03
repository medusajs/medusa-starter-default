import { defineWidgetConfig } from "@medusajs/admin-sdk"

const StockLocationDetailsWidget = () => {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Granular Location Details</h3>
      <p className="text-sm text-gray-600 mb-4">
        Manage specific location codes like zones, aisles, shelves, and bins for this stock location.
      </p>
      
      <div className="space-y-2">
        <div className="text-sm">
          <strong>Coming soon:</strong> Full UI for managing granular locations
        </div>
        <div className="text-xs text-gray-500">
          Use the API endpoints at <code>/admin/stock-location-details</code> to manage location codes
        </div>
      </div>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "stock_location.details.after",
})

export default StockLocationDetailsWidget 