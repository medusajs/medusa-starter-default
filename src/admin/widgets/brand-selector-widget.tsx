import React, { useState, useEffect } from "react"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Select, Button, Badge, Text } from "@medusajs/ui"

interface Brand {
  id: string
  name: string
  code: string
  is_oem: boolean
  authorized_dealer: boolean
  is_active: boolean
}

const BrandSelectorWidget = ({ product }: { product: any }) => {
  const [brands, setBrands] = useState<Brand[]>([])
  const [selectedBrandIds, setSelectedBrandIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch available brands
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch('/admin/brands?is_active=true&limit=100')
        const data = await response.json()
        setBrands(data.brands || [])
        
        // If product has existing brand associations, set them
        if (product?.brands) {
          setSelectedBrandIds(product.brands.map((b: Brand) => b.id))
        }
      } catch (error) {
        console.error('Error fetching brands:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBrands()
  }, [product])

  const handleBrandToggle = (brandId: string) => {
    setSelectedBrandIds(prev => 
      prev.includes(brandId) 
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    )
  }

  const saveBrandAssociations = async () => {
    try {
      // This would typically call an API to update product-brand associations
      const response = await fetch(`/admin/products/${product.id}/brands`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_ids: selectedBrandIds
        })
      })
      
      if (response.ok) {
        // Show success message
        console.log('Brand associations updated successfully')
      }
    } catch (error) {
      console.error('Error updating brand associations:', error)
    }
  }

  if (loading) {
    return (
      <Container>
        <Text>Loading brands...</Text>
      </Container>
    )
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <Heading level="h3">Brand Associations</Heading>
        <Button onClick={saveBrandAssociations} size="small">
          Save Associations
        </Button>
      </div>
      
      <div className="space-y-3">
        <Text className="text-sm text-gray-600">
          Select the brands that manufacture or supply this part:
        </Text>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {brands.map((brand) => (
            <div
              key={brand.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedBrandIds.includes(brand.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleBrandToggle(brand.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{brand.name}</div>
                  <div className="text-sm text-gray-500">{brand.code}</div>
                </div>
                <div className="flex flex-col gap-1">
                  {brand.is_oem && (
                    <Badge color="green" size="small">OEM</Badge>
                  )}
                  {brand.authorized_dealer && (
                    <Badge color="blue" size="small">Authorized</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {selectedBrandIds.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <Text className="text-sm font-medium mb-2">
              Selected Brands ({selectedBrandIds.length}):
            </Text>
            <div className="flex flex-wrap gap-2">
              {brands
                .filter(brand => selectedBrandIds.includes(brand.id))
                .map(brand => (
                  <Badge key={brand.id} color="grey">
                    {brand.code}
                  </Badge>
                ))
              }
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}

// Widget configuration
export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default BrandSelectorWidget 