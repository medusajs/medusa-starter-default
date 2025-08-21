import { useParams } from "react-router-dom"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { RouteFocusModal } from "../../../../../components/modals"
import { SupplierPriceListAddForm } from "./components/supplier-price-list-add-form"

const SupplierPriceListAdd = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <RouteFocusModal>
      {id && (
        <SupplierPriceListAddForm supplierId={id} />
      )}
    </RouteFocusModal>
  )
}

export const config = defineRouteConfig({})
export default SupplierPriceListAdd