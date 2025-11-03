/**
 * Supplier Configuration Settings Page
 *
 * Allows admins to configure:
 * 1. Discount Structure - How discounts are provided in price lists
 * 2. Import Defaults - Default settings for the import wizard
 *
 * Located at: Settings → Suppliers → [Supplier Name] → Configuration
 */

import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { SupplierDiscountConfigForm } from "../../../../../components/supplier-discount-config-form"
import { SupplierImportDefaultsForm } from "../../../../../components/supplier-import-defaults-form"

type DiscountStructure = {
  type: "net_only" | "calculated" | "percentage" | "code_mapping"
  description?: string
  default_percentage?: number
  mappings?: Record<string, number>
}

type ImportDefaults = {
  pricing_mode: "net_only" | "calculated" | "percentage" | "code_mapping"
  parsing_method: "template" | "delimited" | "fixed-width"
  template_id?: string
  delimiter?: string
}

type Supplier = {
  id: string
  name: string
  metadata?: {
    discount_structure?: DiscountStructure
    import_defaults?: ImportDefaults
  }
}

const SupplierConfigurationPage = () => {
  const { id } = useParams<{ id: string }>()
  const [discountStructure, setDiscountStructure] = useState<DiscountStructure | undefined>()
  const [importDefaults, setImportDefaults] = useState<ImportDefaults | undefined>()

  // Fetch supplier data
  const { data: supplier, isLoading, refetch } = useQuery<Supplier>({
    queryKey: ["supplier", id],
    queryFn: async () => {
      const response = await fetch(`/admin/suppliers/${id}`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch supplier')
      }
      const data = await response.json()
      return data.supplier
    },
    enabled: !!id
  })

  // Update local state when supplier data loads
  useEffect(() => {
    if (supplier) {
      setDiscountStructure(supplier.metadata?.discount_structure)
      setImportDefaults(supplier.metadata?.import_defaults)
    }
  }, [supplier])

  const handleDiscountStructureSaved = (structure: DiscountStructure) => {
    setDiscountStructure(structure)
    refetch()
  }

  const handleImportDefaultsSaved = (defaults: ImportDefaults) => {
    setImportDefaults(defaults)
    refetch()
  }

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h1">Loading...</Heading>
        </div>
      </Container>
    )
  }

  if (!supplier) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h1">Supplier Not Found</Heading>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Supplier Configuration</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {supplier.name}
          </Text>
        </div>
      </div>

      {/* Discount Structure Section */}
      <div className="px-6 py-6">
        <SupplierDiscountConfigForm
          supplierId={id!}
          initialStructure={discountStructure}
          onSaved={handleDiscountStructureSaved}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-ui-border-base" />

      {/* Import Defaults Section */}
      <div className="px-6 py-6">
        <SupplierImportDefaultsForm
          supplierId={id!}
          initialDefaults={importDefaults}
          discountStructureType={discountStructure?.type}
          onSaved={handleImportDefaultsSaved}
        />
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Configuration",
})

export default SupplierConfigurationPage
