/**
 * Step 2: Parse Configuration Component (Refactored)
 *
 * Simplified, user-friendly interface for configuring file parsing.
 * - Choose parsing method (Delimited or Fixed-Width)
 * - Select delimiter (for CSV)
 * - Interactive file preview showing parsed results
 *
 * @see TEM-303 - Frontend: Build Step 2 - Parse Configuration Component
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Button, Text, Heading, Label, RadioGroup, Input, Select, toast } from "@medusajs/ui"
import { IMPORT_TEMPLATES, ImportTemplate } from "../../lib/import-templates"
import { SupplierImportDefaults } from "./Step1FileUpload"

interface Step2ParseConfigurationProps {
  fileContent: string
  fileName: string
  supplierId: string
  supplierDefaults: SupplierImportDefaults | null
  onConfigured: (config: ParseConfig, preview: PreviewData) => void
  onBack: () => void
  onNext: () => void
  initialConfig?: ParseConfig
}

export interface ParseConfig {
  format_type: 'csv' | 'fixed-width'
  delimiter?: string
  quote_char?: string
  has_header?: boolean
  skip_rows?: number
  fixed_width_columns?: Array<{
    name: string
    start: number
    width: number
  }>
  transformations?: Record<string, {
    type: 'divide' | 'date' | 'substring' | 'trim_zeros'
    divisor?: number
    input_format?: string
    start?: number
    length?: number
  }>
}

export interface PreviewData {
  detected_columns: string[]
  preview_rows: Array<Record<string, any>>
  warnings: string[]
  errors: string[]
  stats: {
    total_rows_in_file: number
    rows_previewed: number
  }
}

export function Step2ParseConfiguration({
  fileContent,
  fileName,
  supplierId,
  supplierDefaults,
  onConfigured,
  onBack,
  onNext,
  initialConfig,
}: Step2ParseConfigurationProps) {
  // Determine initial parsing method from supplier defaults or config
  const fileType = fileName.toLowerCase().endsWith('.csv') ? 'csv' : 'txt'
  const initialParsingMethod = initialConfig?.format_type === 'fixed-width'
    ? 'fixed-width'
    : supplierDefaults?.parsing_method || 'delimited'

  const [parsingMethod, setParsingMethod] = useState<'template' | 'delimited' | 'fixed-width'>(
    initialParsingMethod
  )

  // Template state (code-based templates from registry)
  // useMemo to prevent recreating the array on every render
  const templates = useMemo(() => Object.values(IMPORT_TEMPLATES), [])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    supplierDefaults?.template_id || ''
  )

  // Delimiter state (for delimited mode) - Use supplier defaults if available
  const [delimiter, setDelimiter] = useState(
    initialConfig?.delimiter || supplierDefaults?.delimiter || ','
  )
  const [customDelimiter, setCustomDelimiter] = useState('')

  // Determine if current delimiter is a standard one
  const standardDelimiters = [',', ';', '\t']
  const isCustomDelimiter = !standardDelimiters.includes(delimiter)
  const [delimiterChoice, setDelimiterChoice] = useState<string>(
    isCustomDelimiter ? 'custom' : delimiter
  )

  // Fixed-width columns state
  const [fixedWidthColumns, setFixedWidthColumns] = useState<Array<{
    name: string
    start: number
    width: number
  }>>(initialConfig?.fixed_width_columns || [])

  // Preview state
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Use ref to store the latest onConfigured callback
  const onConfiguredRef = useRef(onConfigured)
  useEffect(() => {
    onConfiguredRef.current = onConfigured
  }, [onConfigured])

  // Auto-detect delimiter on mount
  const autoDetectDelimiter = useCallback((content: string): string => {
    const lines = content.split('\n').slice(0, 3).filter(line => line.trim())
    const delimiters = [',', ';', '\t']
    const counts: Record<string, number[]> = {}

    for (const delim of delimiters) {
      counts[delim] = lines.map(line =>
        (line.match(new RegExp(`\\${delim}`, 'g')) || []).length
      )
    }

    let bestDelimiter = ','
    let bestScore = 0

    for (const delim of delimiters) {
      const lineCounts = counts[delim]
      const avg = lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length
      const isConsistent = lineCounts.every(count => count === lineCounts[0])

      if (isConsistent && avg > 0 && avg > bestScore) {
        bestScore = avg
        bestDelimiter = delim
      }
    }

    return bestDelimiter
  }, [])

  // Auto-detect on mount for CSV
  useEffect(() => {
    if (!initialConfig) {
      const detected = autoDetectDelimiter(fileContent)
      setDelimiter(detected)
      setDelimiterChoice(detected)
    }
  }, [fileContent, autoDetectDelimiter, initialConfig])

  // Handle delimiter choice change
  const handleDelimiterChoiceChange = (value: string) => {
    setDelimiterChoice(value)
    if (value === 'custom') {
      // If switching to custom, use the custom delimiter if set, otherwise empty
      if (customDelimiter) {
        setDelimiter(customDelimiter)
      }
    } else {
      // Standard delimiter selected
      setDelimiter(value)
    }
  }

  // Handle custom delimiter input change
  const handleCustomDelimiterChange = (value: string) => {
    // Only take the first character
    const char = value.charAt(0)
    setCustomDelimiter(char)
    if (char) {
      setDelimiter(char)
    }
  }

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)

    const template = templates.find(t => t.id === templateId)
    if (!template) return

    // Apply template configuration
    const config = template.parse_config

    if (config.format_type === 'csv') {
      setDelimiter(config.delimiter || ',')
      setDelimiterChoice(config.delimiter || ',')
    } else if (config.format_type === 'fixed-width') {
      setFixedWidthColumns(config.fixed_width_columns || [])
    }

    toast.success('Template applied', {
      description: `Using "${template.name}" configuration`,
    })
  }

  // Fetch preview from API (stable function that doesn't change on every render)
  const fetchPreview = useCallback(async (config: ParseConfig) => {
    setIsLoadingPreview(true)
    setPreviewError(null)

    try {
      const response = await fetch(
        `/admin/suppliers/${supplierId}/price-lists/parse-wizard-preview`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_content: fileContent,
            file_type: config.format_type === 'csv' ? 'csv' : 'txt',
            parse_config: config,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to parse file')
      }

      const data: PreviewData = await response.json()
      setPreviewData(data)

      if (data.errors.length > 0) {
        setPreviewError(data.errors[0])
      }

      // Call parent with config and preview using the ref
      onConfiguredRef.current(config, data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch preview'
      setPreviewError(message)
      toast.error('Preview failed', { description: message })
    } finally {
      setIsLoadingPreview(false)
    }
  }, [fileContent, supplierId]) // Removed onConfigured from dependencies

  // Fetch preview when template is selected
  useEffect(() => {
    if (parsingMethod === 'template' && selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId)
      if (!template) return

      const config = template.parse_config

      // Fetch preview with template config
      const timeoutId = setTimeout(() => {
        fetchPreview(config)
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [parsingMethod, selectedTemplateId, templates, fetchPreview])

  // Fetch preview when delimited config changes
  useEffect(() => {
    if (parsingMethod === 'delimited') {
      const config: ParseConfig = {
        format_type: 'csv',
        delimiter,
        quote_char: '"',
        has_header: true,
        skip_rows: 0,
      }

      // Debounce the fetch
      const timeoutId = setTimeout(() => {
        fetchPreview(config)
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [parsingMethod, delimiter, fetchPreview])

  // Fetch preview when fixed-width config changes
  useEffect(() => {
    if (parsingMethod === 'fixed-width' && fixedWidthColumns.length > 0) {
      const config: ParseConfig = {
        format_type: 'fixed-width',
        skip_rows: 0,
        fixed_width_columns: fixedWidthColumns,
      }

      // Debounce the fetch
      const timeoutId = setTimeout(() => {
        fetchPreview(config)
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }, [parsingMethod, fixedWidthColumns, fetchPreview])

  const handleNext = () => {
    if (!previewData || previewData.errors.length > 0) {
      toast.error('Cannot proceed', {
        description: 'Please fix configuration errors before continuing',
      })
      return
    }
    onNext()
  }

  const isValidConfig = previewData && previewData.errors.length === 0

  return (
    <div className="flex flex-col gap-y-8">
      {/* Parsing Method Selection */}
      <div>
        <Heading level="h2" className="mb-4">
          Choose Parsing Method
        </Heading>
        <RadioGroup
          value={parsingMethod}
          onValueChange={(value) => setParsingMethod(value as 'template' | 'delimited' | 'fixed-width')}
          className="grid grid-cols-2 gap-3"
        >
          <RadioGroup.ChoiceBox
            value="template"
            label="Use Template"
            description="Load a saved configuration"
          />
          <RadioGroup.ChoiceBox
            value="delimited"
            label="Delimited File (CSV)"
            description="Comma, tab, or custom delimiter"
          />
          <RadioGroup.ChoiceBox
            value="fixed-width"
            label="Fixed-Width Columns"
            description="Text files with aligned columns"
            className="col-span-2"
          />
        </RadioGroup>
      </div>

      {/* Template Selection */}
      {parsingMethod === 'template' && (
        <div>
          <Label className="mb-3">Select Template</Label>
          {templates.length === 0 ? (
            <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-4">
              <Text size="small" className="text-ui-fg-subtle">
                No templates available. Contact your administrator to add import templates.
              </Text>
            </div>
          ) : (
            <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
              <Select.Trigger>
                <Select.Value placeholder="Choose a template" />
              </Select.Trigger>
              <Select.Content>
                {templates.map((template) => (
                  <Select.Item key={template.id} value={template.id}>
                    <div className="flex flex-col">
                      <Text weight="plus">{template.name}</Text>
                      {template.description && (
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          {template.description}
                        </Text>
                      )}
                    </div>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          )}
        </div>
      )}

      {/* Delimiter Selection (for delimited mode) */}
      {parsingMethod === 'delimited' && (
        <div>
          <Label className="mb-3">Select Delimiter</Label>
          <RadioGroup
            value={delimiterChoice}
            onValueChange={handleDelimiterChoiceChange}
            className="grid grid-cols-2 gap-3"
          >
            <RadioGroup.ChoiceBox
              value=","
              label="Comma (,)"
              description="Most common for CSV files"
            />
            <RadioGroup.ChoiceBox
              value=";"
              label="Semicolon (;)"
              description="Common in European formats"
            />
            <RadioGroup.ChoiceBox
              value={'\t'}
              label="Tab"
              description="Tab-separated values"
            />
            <RadioGroup.ChoiceBox
              value="custom"
              label="Custom"
              description="Enter your own delimiter character"
            />
          </RadioGroup>

          {/* Custom Delimiter Input */}
          {delimiterChoice === 'custom' && (
            <div className="mt-4 max-w-xs">
              <Label htmlFor="custom-delimiter" className="mb-2">
                Custom Delimiter Character
              </Label>
              <Input
                id="custom-delimiter"
                value={customDelimiter}
                onChange={(e) => handleCustomDelimiterChange(e.target.value)}
                placeholder="Enter single character"
                maxLength={1}
                className="font-mono"
              />
              <Text size="xsmall" className="text-ui-fg-subtle mt-1">
                Enter a single character to use as delimiter
              </Text>
            </div>
          )}
        </div>
      )}

      {/* Fixed-Width Column Configuration */}
      {parsingMethod === 'fixed-width' && (
        <FixedWidthColumnSelector
          fileContent={fileContent}
          columns={fixedWidthColumns}
          onColumnsChange={setFixedWidthColumns}
        />
      )}

      {/* Interactive Preview */}
      <div>
        <Label className="mb-3">File Preview</Label>

        {isLoadingPreview && (
          <div className="flex items-center justify-center py-8 border border-ui-border-base rounded-lg bg-ui-bg-subtle">
            <Text size="small" className="text-ui-fg-subtle">Loading preview...</Text>
          </div>
        )}

        {previewError && (
          <div className="bg-ui-bg-error-subtle border border-ui-border-error p-4 rounded-lg">
            <Text size="small" className="text-ui-fg-error">{previewError}</Text>
          </div>
        )}

        {previewData && !previewError && !isLoadingPreview && (
          <div className="overflow-x-auto border border-ui-border-base rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-ui-bg-subtle">
                <tr>
                  {previewData.detected_columns.map((col, idx) => (
                    <th key={idx} className="px-4 py-3 text-left font-medium border-b border-ui-border-base">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.preview_rows.slice(0, 10).map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-ui-border-base last:border-b-0 hover:bg-ui-bg-subtle-hover">
                    {previewData.detected_columns.map((col, colIdx) => (
                      <td key={colIdx} className="px-4 py-3">
                        {row[col] || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {previewData && !isLoadingPreview && (
          <div className="flex items-center gap-2 mt-3">
            <Text size="xsmall" className="text-ui-fg-subtle">
              {previewData.detected_columns.length} columns detected •
              Showing {Math.min(10, previewData.preview_rows.length)} of {previewData.stats.total_rows_in_file} rows
            </Text>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex justify-between pt-4 border-t border-ui-border-base">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleNext}
          disabled={!isValidConfig}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

// Fixed-Width Column Selector Component
interface FixedWidthColumnSelectorProps {
  fileContent: string
  columns: Array<{ name: string; start: number; width: number }>
  onColumnsChange: (columns: Array<{ name: string; start: number; width: number }>) => void
}

function FixedWidthColumnSelector({
  fileContent,
  columns,
  onColumnsChange,
}: FixedWidthColumnSelectorProps) {
  const lines = fileContent.split('\n').slice(0, 5)
  const maxLineLength = Math.max(...lines.map(line => line.length), 80)

  const autoDetectColumns = () => {
    const firstLine = lines[0] || ''
    const segments: Array<{ start: number; width: number }> = []
    let inWord = false
    let wordStart = 0

    for (let i = 0; i < firstLine.length; i++) {
      const isSpace = firstLine[i] === ' ' || firstLine[i] === '\t'

      if (!isSpace && !inWord) {
        wordStart = i
        inWord = true
      } else if (isSpace && inWord) {
        segments.push({ start: wordStart, width: i - wordStart })
        inWord = false
      }
    }

    if (inWord) {
      segments.push({ start: wordStart, width: firstLine.length - wordStart })
    }

    onColumnsChange(
      segments.map((seg, idx) => ({
        name: `col_${idx + 1}`,
        start: seg.start,
        width: seg.width,
      }))
    )

    toast.success('Auto-detected columns', {
      description: `Found ${segments.length} potential columns`,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Label>Column Breaks ({columns.length} columns)</Label>
        <Button size="small" variant="secondary" onClick={autoDetectColumns}>
          Auto-detect Columns
        </Button>
      </div>

      <div className="bg-ui-bg-subtle p-4 rounded-lg border border-ui-border-base">
        <Text size="small" className="text-ui-fg-subtle mb-3">
          Click "Auto-detect Columns" to automatically identify column boundaries based on spacing patterns.
        </Text>
        <pre className="text-xs font-mono overflow-x-auto">
          {lines.map((line, idx) => (
            <div key={idx} className="whitespace-pre">{line || ' '}</div>
          ))}
        </pre>
      </div>

      {columns.length > 0 && (
        <div className="text-ui-fg-subtle">
          <Text size="xsmall">
            Detected {columns.length} columns: {columns.map(c => c.name).join(', ')}
          </Text>
        </div>
      )}
    </div>
  )
}
