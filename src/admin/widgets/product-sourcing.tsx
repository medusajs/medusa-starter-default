import { ProductDetailsWidgetProps } from "@medusajs/admin"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Table,
  Badge,
  Button,
  Input,
  toast,
} from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

type VariantWithSourcing = {
  id: string
  title: string
  sku: string | null
  sourcing: {
    id: string
    supplier: {
      id: string
      name: string
    }
    price: number
    supplier_sku: string | null
  }[]
}

const ProductSourcingWidget = ({ product }: ProductDetailsWidgetProps) => {
  const queryClient = useQueryClient()
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({})

  const { data, isLoading } = useQuery<{
    variants: VariantWithSourcing[]
  }>({
    queryKey: ["product_sourcing", product.id],
    queryFn: async () => {
      const response = await fetch(
        `/admin/products/${product.id}/suppliers`
      )
      return response.json()
    },
    enabled: !!product, // Prevent query from running until product is available
  })

  const addItemMutation = useMutation({
    mutationFn: (data: {
      supplier_id: string
      item: {
        product_variant_id: string
        quantity: number
        unit_price: number
      }
    }) => {
      return fetch(`/admin/purchase-orders/draft/add-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      toast.success("Item added to purchase list.")
      queryClient.invalidateQueries({ queryKey: ["draft_purchase_orders"] })
    },
    onError: (error) => {
       toast.error(`Failed to add item: ${error.message}`)
    }
  })

  const handleAddToPurchaseList = (
    variant: VariantWithSourcing,
    sourcingOption: VariantWithSourcing["sourcing"][0]
  ) => {
    const key = `${variant.id}-${sourcingOption.supplier.id}`
    const quantity = quantities[key]

    if (!quantity || quantity <= 0) {
      toast.warning("Please enter a quantity greater than 0.")
      return
    }

    addItemMutation.mutate({
      supplier_id: sourcingOption.supplier.id,
      item: {
        product_variant_id: variant.id,
        quantity: quantity,
        unit_price: sourcingOption.price,
      },
    })
  }

  const getCheapestPrice = (sourcingOptions: VariantWithSourcing["sourcing"]) => {
    if (!sourcingOptions || sourcingOptions.length === 0) {
      return null
    }
    return Math.min(...sourcingOptions.map(s => s.price))
  }

  if (!product) {
    // Render nothing or a placeholder if product is not yet available
    return null
  }

  return (
    <Container>
      <Heading level="h2" className="mb-4">
        Sourcing
      </Heading>
      {isLoading && <p>Loading sourcing options...</p>}
      {data?.variants.map((variant) => (
        <div key={variant.id} className="mb-8 p-4 border rounded-lg">
          <Heading level="h3" className="mb-2">
            Variant: {variant.title} {variant.sku && `(${variant.sku})`}
          </Heading>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Supplier</Table.HeaderCell>
                <Table.HeaderCell>Price</Table.HeaderCell>
                <Table.HeaderCell>Quantity</Table.HeaderCell>
                <Table.HeaderCell>Action</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {variant.sourcing.map((sourcingOption) => {
                const cheapestPrice = getCheapestPrice(variant.sourcing)
                const isCheapest = sourcingOption.price === cheapestPrice

                return (
                  <Table.Row key={sourcingOption.id}>
                    <Table.Cell>{sourcingOption.supplier.name}</Table.Cell>
                    <Table.Cell>
                      {sourcingOption.price / 100}{" "}
                      {isCheapest && <Badge color="green">Cheapest</Badge>}
                    </Table.Cell>
                    <Table.Cell>
                      <Input
                        type="number"
                        min="1"
                        placeholder="0"
                        value={quantities[`${variant.id}-${sourcingOption.supplier.id}`] || ""}
                        onChange={(e) =>
                          setQuantities({
                            ...quantities,
                            [`${variant.id}-${sourcingOption.supplier.id}`]: parseInt(e.target.value),
                          })
                        }
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <Button
                        onClick={() =>
                          handleAddToPurchaseList(variant, sourcingOption)
                        }
                        disabled={addItemMutation.isPending}
                      >
                        Add to List
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        </div>
      ))}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductSourcingWidget 