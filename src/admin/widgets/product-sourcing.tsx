import { WidgetConfig, ProductDetailsWidgetProps } from "@medusajs/admin"
import {
  Container,
  Heading,
  Table,
  Badge,
  Button,
  Input,
  useToast,
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
  const { toast } = useToast()
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
      toast({
        title: "Success",
        description: "Item added to purchase list.",
        variant: "success",
      })
      queryClient.invalidateQueries({ queryKey: ["draft_purchase_orders"] })
    },
    onError: () => {
       toast({
        title: "Error",
        description: "Failed to add item to list.",
        variant: "error",
      })
    }
  })

  const handleAddToPurchaseList = (
    variant: VariantWithSourcing,
    sourcingOption: VariantWithSourcing["sourcing"][0]
  ) => {
    const key = `${variant.id}-${sourcingOption.supplier.id}`
    const quantity = quantities[key]

    if (!quantity || quantity <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a quantity greater than 0.",
        variant: "warning",
      })
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

export const config: WidgetConfig = {
  zone: "product.details.after",
}

export default ProductSourcingWidget 