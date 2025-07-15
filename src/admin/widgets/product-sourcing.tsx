import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Table,
  Badge,
  Button,
  Input,
  Text,
  toast,
} from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

// Define the product interface based on what's passed to widgets
interface Product {
  id: string
  title: string
  // Add other product fields as needed
}

interface WidgetProps {
  data: Product
}

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
    price_list_name?: string | null
  }[]
}

const ProductSourcingWidget = ({ data: product }: WidgetProps) => {
  const queryClient = useQueryClient()
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({})

  const { data, isLoading, error } = useQuery<{
    variants: VariantWithSourcing[]
  }>({
    queryKey: ["product_sourcing", product?.id],
    queryFn: async () => {
      const response = await fetch(
        `/admin/products/${product.id}/suppliers`
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sourcing data: ${response.statusText}`)
      }
      
      return response.json()
    },
    enabled: !!product?.id, // Prevent query from running until product is available
  })

  const addItemMutation = useMutation({
    mutationFn: async (data: {
      supplier_id: string
      item: {
        product_variant_id: string
        quantity: number
        unit_price: number
      }
    }) => {
      const response = await fetch(`/admin/purchase-orders/draft/add-item`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed: ${response.statusText}`)
      }
      
      return response.json()
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100)
  }

  if (!product?.id) {
    return null
  }

  if (error) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Sourcing</Heading>
        </div>
        <div className="px-6 py-8 text-center">
          <Text className="text-ui-fg-error">Failed to load sourcing data</Text>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {error.message}
          </Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Sourcing</Heading>
        {data?.variants && (
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {data.variants.length} variant{data.variants.length !== 1 ? 's' : ''} available
          </Text>
        )}
      </div>
      
      {isLoading && (
        <div className="px-6 py-8 text-center">
          <Text>Loading sourcing options...</Text>
        </div>
      )}
      
      {data?.variants && data.variants.length === 0 && (
        <div className="px-6 py-8 text-center">
          <Text className="text-ui-fg-muted">No sourcing options available for this product</Text>
        </div>
      )}
      
      {data?.variants?.map((variant) => (
        <div key={variant.id} className="px-6 py-6">
          <div className="mb-4">
            <Heading level="h3" className="mb-1">
              {variant.title}
            </Heading>
            {variant.sku && (
              <Text size="small" className="text-ui-fg-subtle">
                SKU: {variant.sku}
              </Text>
            )}
          </div>
          
          {variant.sourcing.length === 0 ? (
            <Text className="text-ui-fg-muted">No sourcing options available for this variant</Text>
          ) : (
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
                  const inputKey = `${variant.id}-${sourcingOption.supplier.id}`

                  return (
                    <Table.Row key={sourcingOption.id}>
                      <Table.Cell>
                        <div>
                          <Text weight="plus">{sourcingOption.supplier.name}</Text>
                          {sourcingOption.supplier_sku && (
                            <Text size="small" className="text-ui-fg-subtle">
                              Supplier SKU: {sourcingOption.supplier_sku}
                            </Text>
                          )}
                          {sourcingOption.price_list_name && (
                            <div className="flex items-center gap-1 mt-1">
                              <Badge color="blue" size="2xsmall">
                                Price List
                              </Badge>
                              <Text size="small" className="text-ui-fg-subtle">
                                {sourcingOption.price_list_name}
                              </Text>
                            </div>
                          )}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <div className="flex items-center gap-2">
                          <Text>{formatPrice(sourcingOption.price)}</Text>
                          {isCheapest && variant.sourcing.length > 1 && (
                            <Badge color="green" size="2xsmall">
                              Cheapest
                            </Badge>
                          )}
                        </div>
                      </Table.Cell>
                      <Table.Cell>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="0"
                          className="w-20"
                          value={quantities[inputKey] || ""}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0
                            setQuantities({
                              ...quantities,
                              [inputKey]: value,
                            })
                          }}
                        />
                      </Table.Cell>
                      <Table.Cell>
                        <Button
                          size="small"
                          onClick={() =>
                            handleAddToPurchaseList(variant, sourcingOption)
                          }
                          disabled={addItemMutation.isPending || !quantities[inputKey] || quantities[inputKey] <= 0}
                        >
                          {addItemMutation.isPending ? "Adding..." : "Add to List"}
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table>
          )}
        </div>
      ))}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductSourcingWidget 