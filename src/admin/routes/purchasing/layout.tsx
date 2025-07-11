import { Outlet } from "react-router-dom"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Tag } from "@medusajs/icons"

const PurchasingLayout = () => {
  return <Outlet />
}

export const config = defineRouteConfig({
  label: "Purchasing",
  icon: Tag,
})

export default PurchasingLayout 