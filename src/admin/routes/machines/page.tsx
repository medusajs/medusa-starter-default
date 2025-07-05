import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"

const MachinesPage = () => {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Machine Fleet Management</h1>
      <p>This is a test page to verify the UI route is working.</p>
      <button>Test Button</button>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Machines",
})

export default MachinesPage
