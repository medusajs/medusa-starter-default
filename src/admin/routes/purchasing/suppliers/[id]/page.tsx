import { Navigate } from "react-router-dom"
import { useParams } from "react-router-dom"

const SupplierDetailPage = () => {
  const { id } = useParams()
  
  // Redirect to the main supplier detail page
  return <Navigate to={`/admin/suppliers/${id}`} replace />
}

export default SupplierDetailPage 