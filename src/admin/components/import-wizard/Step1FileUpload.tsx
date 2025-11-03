/**
 * Step 1: File Upload Component
 *
 * Handles file selection via drag-and-drop or click-to-browse.
 * Validates file type, size, and content before proceeding.
 * Fetches supplier defaults to pre-populate wizard settings.
 *
 * Performance optimizations:
 * - useCallback wrapping for all event handlers to prevent re-renders
 * - useMemo for badge label computations
 * - Stable useEffect dependencies (only supplierId)
 * - Helper functions extracted outside component
 *
 * @see TEM-302 - Frontend: Build Step 1 - File Upload Component
 */

import { useState, useRef, useEffect, useCallback, useMemo, DragEvent } from "react"
import { Button, Text, toast, Badge } from "@medusajs/ui"
import { ArrowUpTray, CheckCircle, ArrowPath } from "@medusajs/icons"

export interface SupplierImportDefaults {
  pricing_mode: "net_only" | "calculated" | "percentage" | "code_mapping"
  parsing_method: "template" | "delimited" | "fixed-width"
  template_id?: string
  delimiter?: string
}

interface Step1FileUploadProps {
  supplierId: string
  onFileSelected: (file: File, content: string) => void
  onNext: () => void
  onSupplierDefaultsLoaded?: (defaults: SupplierImportDefaults | null) => void
  selectedFile: File | null
  fileContent: string | null
}

interface FileInfo {
  name: string
  size: number
  type: string
  lineCount: number
  encoding: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_EXTENSIONS = ['.csv', '.txt']

/**
 * Helper functions to format badge labels
 * Extracted to prevent re-computation on every render
 */
const getParsingMethodLabel = (method: SupplierImportDefaults['parsing_method'], delimiter?: string): string => {
  switch (method) {
    case 'template':
      return 'Template'
    case 'delimited':
      return `Delimited (${delimiter || ','})`
    case 'fixed-width':
      return 'Fixed-width'
    default:
      return 'Unknown'
  }
}

const getPricingModeLabel = (mode: SupplierImportDefaults['pricing_mode']): string => {
  switch (mode) {
    case 'net_only':
      return 'Net only'
    case 'calculated':
      return 'Gross+Net'
    case 'percentage':
      return 'Discount %'
    case 'code_mapping':
      return 'Discount codes'
    default:
      return 'Unknown'
  }
}

export function Step1FileUpload({
  supplierId,
  onFileSelected,
  onNext,
  onSupplierDefaultsLoaded,
  selectedFile,
  fileContent,
}: Step1FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const [supplierDefaults, setSupplierDefaults] = useState<SupplierImportDefaults | null>(null)
  const [supplierName, setSupplierName] = useState<string>("")
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch supplier import defaults on mount
  // Only depends on supplierId - callback is now stable via useCallback in parent
  useEffect(() => {
    const fetchSupplierDefaults = async () => {
      setIsLoadingDefaults(true)
      try {
        const response = await fetch(`/admin/suppliers/${supplierId}/import-defaults`, {
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          setSupplierDefaults(data.import_defaults)
          setSupplierName(data.supplier_name || "")
          onSupplierDefaultsLoaded?.(data.import_defaults)
        }
      } catch (error) {
        console.error('Failed to fetch supplier defaults:', error)
        // Silently fail - defaults are optional
      } finally {
        setIsLoadingDefaults(false)
      }
    }

    if (supplierId) {
      fetchSupplierDefaults()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  // Memoize badge labels to prevent recalculation on every render
  const parsingMethodLabel = useMemo(() => {
    if (!supplierDefaults) return null
    return getParsingMethodLabel(supplierDefaults.parsing_method, supplierDefaults.delimiter)
  }, [supplierDefaults])

  const pricingModeLabel = useMemo(() => {
    if (!supplierDefaults) return null
    return getPricingModeLabel(supplierDefaults.pricing_mode)
  }, [supplierDefaults])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Wrap validation in useCallback for stability
  const validateFile = useCallback((file: File): boolean => {
    // Check file extension
    const hasValidExtension = ACCEPTED_EXTENSIONS.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    )

    if (!hasValidExtension) {
      toast.error('Invalid file type', {
        description: 'Only CSV and TXT files are supported',
      })
      return false
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large', {
        description: `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`,
      })
      return false
    }

    // Check if file is empty
    if (file.size === 0) {
      toast.error('File is empty', {
        description: 'Please select a file with content',
      })
      return false
    }

    return true
  }, [])

  const readFile = useCallback(async (file: File) => {
    setIsReading(true)

    try {
      const reader = new FileReader()

      reader.onload = (e) => {
        const content = e.target?.result as string

        if (!content || content.trim().length === 0) {
          toast.error('File is empty', {
            description: 'The selected file contains no data',
          })
          setIsReading(false)
          return
        }

        const lines = content.split('\n').filter(line => line.trim())
        const lineCount = lines.length

        if (lineCount < 2) {
          toast.error('Invalid file', {
            description: 'File must contain at least 2 lines (header + data)',
          })
          setIsReading(false)
          return
        }

        // Determine file info
        const info: FileInfo = {
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          lineCount,
          encoding: 'UTF-8',
        }

        setFileInfo(info)
        onFileSelected(file, content)
        setIsReading(false)

        toast.success('File loaded successfully', {
          description: `${lineCount} lines detected`,
        })
      }

      reader.onerror = () => {
        toast.error('Failed to read file', {
          description: 'An error occurred while reading the file',
        })
        setIsReading(false)
      }

      reader.readAsText(file, 'UTF-8')
    } catch (error) {
      toast.error('Failed to read file', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
      setIsReading(false)
    }
  }, [onFileSelected])

  const handleFileSelect = useCallback(async (file: File) => {
    if (!validateFile(file)) {
      return
    }

    await readFile(file)
  }, [validateFile, readFile])

  // Wrap event handlers in useCallback to prevent unnecessary re-renders
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleRemoveFile = useCallback(() => {
    setFileInfo(null)
    onFileSelected(null as any, null as any)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onFileSelected])

  const handleChangeFile = useCallback(() => {
    handleRemoveFile()
    setTimeout(() => {
      fileInputRef.current?.click()
    }, 100)
  }, [handleRemoveFile])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <Text size="large" weight="plus" className="mb-2">
          Upload Price List File
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          Select a CSV or TXT file containing your price list data
        </Text>

        {/* Supplier Defaults Info */}
        {!isLoadingDefaults && supplierDefaults && parsingMethodLabel && pricingModeLabel && (
          <div className="mt-3 flex items-center gap-2">
            <Text size="xsmall" className="text-ui-fg-subtle">
              Using configured defaults for {supplierName}:
            </Text>
            <Badge size="small" color="blue">
              {parsingMethodLabel}
            </Badge>
            <Badge size="small" color="purple">
              {pricingModeLabel}
            </Badge>
          </div>
        )}
      </div>

      {/* File Upload Area */}
      {!selectedFile && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          className={`
            relative flex flex-col items-center justify-center
            border-2 border-dashed rounded-lg
            p-12 cursor-pointer
            transition-all duration-200
            ${isDragOver
              ? 'border-ui-fg-interactive bg-ui-bg-interactive'
              : 'border-ui-border-base bg-ui-bg-subtle hover:bg-ui-bg-subtle-hover hover:border-ui-border-strong'
            }
            ${isReading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={isReading}
          />

          <div className="flex flex-col items-center gap-4">
            <div className={`
              rounded-full p-4
              ${isDragOver ? 'bg-ui-bg-base' : 'bg-ui-bg-base'}
            `}>
              {isReading ? (
                <ArrowPath className="animate-spin text-ui-fg-subtle" />
              ) : (
                <ArrowUpTray className="text-ui-fg-subtle" />
              )}
            </div>

            <div className="text-center">
              <Text weight="plus" className="mb-1">
                {isReading ? 'Reading file...' : 'Drop CSV or TXT file here'}
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                or click to browse
              </Text>
            </div>

            <div className="text-center text-ui-fg-muted">
              <Text size="xsmall" className="block">
                Accepted formats: .csv, .txt
              </Text>
              <Text size="xsmall" className="block">
                Maximum size: 10MB
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* File Info Display */}
      {selectedFile && fileInfo && (
        <div className="border border-ui-border-base rounded-lg p-4 bg-ui-bg-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <CheckCircle className="text-ui-fg-on-color bg-ui-tag-green-icon rounded-full" />
              </div>
              <Text weight="plus">
                {fileInfo.name}
              </Text>
            </div>
            <Button
              size="small"
              variant="secondary"
              onClick={handleChangeFile}
            >
              Change File
            </Button>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex justify-end gap-2 pt-4 border-t border-ui-border-base">
        <Button
          variant="primary"
          onClick={onNext}
          disabled={!selectedFile || !fileContent}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
