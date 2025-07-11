import { Navigate } from "react-router-dom"

export default function PurchasingRedirect() {
  return <Navigate to="/admin/purchase-orders" replace />
} 