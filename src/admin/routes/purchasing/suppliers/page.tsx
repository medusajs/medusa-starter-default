import { Container, Table } from "@medusajs/ui"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { CreateSupplierModal } from "../../../components/create-supplier-modal"
import { SupplierActions } from "../../../components/supplier-actions"

// Data fetching hook
const useSuppliers = () => {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await fetch(`/admin/suppliers`)
      if (!response.ok) {
        throw new Error("Failed to fetch suppliers")
      }
      const data = await response.json()
      return data
    },
  })
}

export type Supplier = {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
}

const SuppliersPage = () => {
  const { data, isLoading } = useSuppliers()

  return (
    <Container>
      <div className="flex justify-between mb-4 items-center">
        <h1 className="text-2xl font-semibold">Suppliers</h1>
        <CreateSupplierModal />
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Email</Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading && <Table.Row><Table.Cell>Loading...</Table.Cell></Table.Row>}
          {data?.suppliers?.map((supplier: Supplier) => (
            <Table.Row key={supplier.id}>
              <Table.Cell>
                <Link to={`/a/purchasing/suppliers/${supplier.id}`} className="text-blue-600 hover:underline">
                  {supplier.name}
                </Link>
              </Table.Cell>
              <Table.Cell>{supplier.email}</Table.Cell>
              <Table.Cell>
                <SupplierActions supplier={supplier} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Suppliers",
})

export default SuppliersPage 