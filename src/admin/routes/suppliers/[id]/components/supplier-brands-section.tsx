import { useEffect, useMemo, useState } from "react"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { BrandSelect } from "../../../../components/common/brand-select"

type Brand = { id: string; name: string; code: string }

export const SupplierBrandsSection = ({ supplierId }: { supplierId: string }) => {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null)

  const fetchBrands = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/admin/suppliers/${supplierId}/brands`)
      if (!res.ok) throw new Error("Failed to fetch brands")
      const data = await res.json()
      setBrands(data.brands ?? [])
    } catch (e: any) {
      toast.error(e.message || "Failed to load brands")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (supplierId) {
      fetchBrands()
    }
  }, [supplierId])

  const linkedIds = useMemo(() => new Set(brands.map((b) => b.id)), [brands])

  const handleAdd = async () => {
    if (!selectedBrandId) return
    try {
      const res = await fetch(`/admin/suppliers/${supplierId}/brands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: selectedBrandId }),
      })
      if (!res.ok) throw new Error("Failed to link brand")
      toast.success("Brand linked")
      setSelectedBrandId(null)
      fetchBrands()
    } catch (e: any) {
      toast.error(e.message || "Failed to link brand")
    }
  }

  const handleRemove = async (brandId: string) => {
    try {
      const res = await fetch(`/admin/suppliers/${supplierId}/brands?brand_id=${brandId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to unlink brand")
      toast.success("Brand unlinked")
      fetchBrands()
    } catch (e: any) {
      toast.error(e.message || "Failed to unlink brand")
    }
  }

  return (
    <Container className="p-6 space-y-4">
      <Heading level="h2">Brands</Heading>
      <div className="flex items-end gap-3">
        <div className="w-80">
          <BrandSelect
            value={selectedBrandId}
            onChange={(v) => setSelectedBrandId(v)}
            includeNoneOption={false}
            label="Add brand"
          />
        </div>
        <Button onClick={handleAdd} disabled={!selectedBrandId}>Link Brand</Button>
      </div>
      <div className="space-y-2">
        {loading ? (
          <Text className="text-ui-fg-muted">Loading brands…</Text>
        ) : brands.length === 0 ? (
          <Text className="text-ui-fg-muted">No brands linked</Text>
        ) : (
          brands.map((b) => (
            <div key={b.id} className="flex items-center justify-between border rounded p-3">
              <div>
                <Text weight="plus">{b.name}</Text>
                <Text size="small" className="text-ui-fg-muted">Code: {b.code}</Text>
              </div>
              <Button variant="danger" size="small" onClick={() => handleRemove(b.id)}>Unlink</Button>
            </div>
          ))
        )}
      </div>
    </Container>
  )
}

export default SupplierBrandsSection


