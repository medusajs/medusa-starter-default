import { Container, Heading } from "@medusajs/ui"
import { useParams } from "react-router-dom"

const SupplierDetailPage = () => {
  const { id } = useParams()

  return (
    <Container>
      <Heading level="h1">Supplier Details</Heading>
      <p>Details for supplier ID: {id}</p>
      {/* TODO: Add Draft Purchase Order and Price List tables */}
    </Container>
  )
}

export default SupplierDetailPage 