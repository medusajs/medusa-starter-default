import { useState } from "react"
import { 
  Button, 
  Container, 
  Heading, 
  Text, 
  Input, 
  Textarea, 
  Label,
  toast,
  Badge
} from "@medusajs/ui"
import { ArrowUpTray, ArrowDownTray, DocumentText, ExclamationCircle } from "@medusajs/icons"

type PriceListUploadProps = {
  supplierId: string
  onSuccess?: () => void
}

type ImportSummary = {
  total_rows: number
  processed_rows: number
  success_count: number
  errors: string[]
}

export const PriceListUpload = ({ supplierId, onSuccess }: PriceListUploadProps) => {
  const [isUploading, setIsUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    effective_date: "",
    expiry_date: "",
    currency_code: "USD",
  })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error("Please select a CSV file")
        return
      }
      setFile(selectedFile)
      if (!formData.name) {
        setFormData(prev => ({
          ...prev,
          name: selectedFile.name.replace('.csv', '')
        }))
      }
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`/admin/suppliers/${supplierId}/price-lists/template`)
      if (!response.ok) {
        throw new Error('Failed to download template')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `price-list-template-supplier-${supplierId}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success("Template downloaded successfully")
    } catch (error) {
      toast.error("Failed to download template")
    }
  }

  const handleUpload = async () => {
    if (!file || !formData.name) {
      toast.error("Please select a file and enter a name")
      return
    }

    setIsUploading(true)
    setImportSummary(null)
    setShowSummary(false)

    try {
      const csvContent = await file.text()
      
      const requestData = {
        name: formData.name,
        description: formData.description || undefined,
        effective_date: formData.effective_date || undefined,
        expiry_date: formData.expiry_date || undefined,
        currency_code: formData.currency_code,
        csv_content: csvContent,
        upload_filename: file.name,
      }

      const response = await fetch(`/admin/suppliers/${supplierId}/price-lists/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed')
      }

      setImportSummary(result.import_summary)
      setShowSummary(true)
      
      if (result.import_summary.errors.length === 0) {
        toast.success(result.message)
        onSuccess?.()
      } else {
        toast.warning(`Upload completed with ${result.import_summary.errors.length} errors`)
      }
      
      // Reset form
      setFile(null)
      setFormData({
        name: "",
        description: "",
        effective_date: "",
        expiry_date: "",
        currency_code: "USD",
      })
      
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Container className="p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h2">Upload Price List</Heading>
            <Text className="text-ui-fg-subtle">
              Import supplier price list from CSV file
            </Text>
          </div>
          <Button
            variant="secondary"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2"
          >
            <ArrowDownTray className="w-4 h-4" />
            Download Template
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Price List Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter price list name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="currency_code">Currency</Label>
              <select
                id="currency_code"
                value={formData.currency_code}
                onChange={(e) => setFormData(prev => ({ ...prev, currency_code: e.target.value }))}
                className="w-full p-2 border border-ui-border-base rounded"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="effective_date">Effective Date</Label>
              <Input
                id="effective_date"
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="file">CSV File *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                {file && (
                  <div className="flex items-center gap-1 text-ui-fg-subtle">
                    <DocumentText className="w-4 h-4" />
                    <Text size="small">{file.name}</Text>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={isUploading || !file || !formData.name}
            className="flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <ArrowUpTray className="w-4 h-4" />
                Upload Price List
              </>
            )}
          </Button>
        </div>

        {showSummary && importSummary && (
          <div className="space-y-4">
            <Heading level="h3">Import Summary</Heading>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Text className="text-2xl font-bold">{importSummary.total_rows}</Text>
                <Text className="text-ui-fg-subtle">Total Rows</Text>
              </div>
              <div className="text-center">
                <Text className="text-2xl font-bold text-green-600">{importSummary.success_count}</Text>
                <Text className="text-ui-fg-subtle">Imported</Text>
              </div>
              <div className="text-center">
                <Text className="text-2xl font-bold text-red-600">{importSummary.errors.length}</Text>
                <Text className="text-ui-fg-subtle">Errors</Text>
              </div>
            </div>
            
            {importSummary.errors.length > 0 && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ExclamationCircle className="w-5 h-5 text-red-600" />
                  <Heading level="h3" className="text-red-800">Import Errors</Heading>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {importSummary.errors.map((error, index) => (
                    <Text key={index} size="small" className="text-red-600">
                      {error}
                    </Text>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Container>
  )
}