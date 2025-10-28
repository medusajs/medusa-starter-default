/**
 * Step 2: Parse Configuration Component
 *
 * Allows users to configure how the file should be parsed:
 * - CSV: Select delimiter, quote char, header settings
 * - Fixed-width: Define column boundaries visually
 *
 * Integrates with parse preview API to show real-time parsed data.
 *
 * @see TEM-303 - Frontend: Build Step 2 - Parse Configuration Component
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { Button, Text, Input, Label, Switch, Badge, toast, Tabs } from "@medusajs/ui"

// Custom debounce hook
function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  )
}

interface Step2ParseConfigurationProps {
  fileContent: string
  fileName: string
  supplierId: string
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

const DELIMITERS = [
  { value: ',', label: 'Comma (,)' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '\t', label: 'Tab' },
  { value: '|', label: 'Pipe (|)' },
]

export function Step2ParseConfiguration({
  fileContent,
  fileName,
  supplierId,
  onConfigured,
  onBack,
  onNext,
  initialConfig,
}: Step2ParseConfigurationProps) {
  const fileType = fileName.toLowerCase().endsWith('.csv') ? 'csv' : 'txt'

  const [selectedTab, setSelectedTab] = useState<'csv' | 'fixed-width'>(
    initialConfig?.format_type || (fileType === 'csv' ? 'csv' : 'fixed-width')
  )

  // CSV configuration state
  const [csvConfig, setCsvConfig] = useState({
    delimiter: initialConfig?.delimiter || ',',
    quote_char: initialConfig?.quote_char || '"',
    has_header: initialConfig?.has_header ?? true,
    skip_rows: initialConfig?.skip_rows || 0,
  })

  // Fixed-width configuration state
  const [fixedWidthColumns, setFixedWidthColumns] = useState<Array<{
    name: string
    start: number
    width: number
  }>>(initialConfig?.fixed_width_columns || [])

  const [skipRowsFixedWidth, setSkipRowsFixedWidth] = useState(initialConfig?.skip_rows || 0)

  // Preview state
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  // Auto-detect delimiter for CSV
  const autoDetectDelimiter = useCallback((content: string): string => {
    const lines = content.split('\n').slice(0, 3).filter(line => line.trim())
    const delimiters = [',', ';', '\t', '|']
    const counts: Record<string, number[]> = {}

    for (const delimiter of delimiters) {
      counts[delimiter] = lines.map(line =>
        (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length
      )
    }

    let bestDelimiter = ','
    let bestScore = 0

    for (const delimiter of delimiters) {
      const lineCounts = counts[delimiter]
      const avg = lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length
      const isConsistent = lineCounts.every(count => count === lineCounts[0])

      if (isConsistent && avg > 0 && avg > bestScore) {
        bestScore = avg
        bestDelimiter = delimiter
      }
    }

    return bestDelimiter
  }, [])

  // Auto-detect on mount for CSV
  useEffect(() => {
    if (fileType === 'csv' && !initialConfig) {
      const detected = autoDetectDelimiter(fileContent)
      setCsvConfig(prev => ({ ...prev, delimiter: detected }))
    }
  }, [fileType, fileContent, autoDetectDelimiter, initialConfig])

  // Fetch preview from API
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

      // Call parent with config and preview
      onConfigured(config, data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch preview'
      setPreviewError(message)
      toast.error('Preview failed', { description: message })
    } finally {
      setIsLoadingPreview(false)
    }
  }, [fileContent, supplierId, onConfigured])

  // Debounce preview fetch
  const debouncedFetchPreview = useDebounce(fetchPreview, 500)

  // Fetch preview when CSV config changes
  useEffect(() => {
    if (selectedTab === 'csv') {
      const config: ParseConfig = {
        format_type: 'csv',
        delimiter: csvConfig.delimiter,
        quote_char: csvConfig.quote_char,
        has_header: csvConfig.has_header,
        skip_rows: csvConfig.skip_rows,
      }
      debouncedFetchPreview(config)
    }
  }, [selectedTab, csvConfig, debouncedFetchPreview])

  // Fetch preview when fixed-width config changes
  useEffect(() => {
    if (selectedTab === 'fixed-width' && fixedWidthColumns.length > 0) {
      const config: ParseConfig = {
        format_type: 'fixed-width',
        skip_rows: skipRowsFixedWidth,
        fixed_width_columns: fixedWidthColumns,
      }
      debouncedFetchPreview(config)
    }
  }, [selectedTab, fixedWidthColumns, skipRowsFixedWidth, debouncedFetchPreview])

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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <Text size="large" weight="plus" className="mb-2">
          Configure File Format
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          Choose how your file should be parsed
        </Text>
      </div>

      {/* Tabs */}
      <Tabs
        value={selectedTab}
        onValueChange={(value) => setSelectedTab(value as 'csv' | 'fixed-width')}
      >
        <Tabs.List>
          <Tabs.Trigger value="csv">CSV/Delimited</Tabs.Trigger>
          <Tabs.Trigger value="fixed-width">Fixed-Width (TXT)</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="csv">
          <CSVConfiguration
            config={csvConfig}
            onChange={setCsvConfig}
            fileContent={fileContent}
            previewData={previewData}
            isLoading={isLoadingPreview}
            error={previewError}
          />
        </Tabs.Content>

        <Tabs.Content value="fixed-width">
          <FixedWidthConfiguration
            columns={fixedWidthColumns}
            onColumnsChange={setFixedWidthColumns}
            skipRows={skipRowsFixedWidth}
            onSkipRowsChange={setSkipRowsFixedWidth}
            fileContent={fileContent}
            previewData={previewData}
            isLoading={isLoadingPreview}
            error={previewError}
          />
        </Tabs.Content>
      </Tabs>

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

// CSV Configuration Sub-component
interface CSVConfigurationProps {
  config: {
    delimiter: string
    quote_char: string
    has_header: boolean
    skip_rows: number
  }
  onChange: (config: any) => void
  fileContent: string
  previewData: PreviewData | null
  isLoading: boolean
  error: string | null
}

function CSVConfiguration({
  config,
  onChange,
  fileContent,
  previewData,
  isLoading,
  error,
}: CSVConfigurationProps) {
  const rawPreview = fileContent.split('\n').slice(0, 3).join('\n')

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Raw File Preview */}
      <div>
        <Label className="mb-2">Raw File Preview (First 3 Lines)</Label>
        <pre className="bg-ui-bg-subtle p-4 rounded-lg text-xs font-mono overflow-x-auto border border-ui-border-base">
          {rawPreview}
        </pre>
      </div>

      {/* Delimiter Selection */}
      <div>
        <Label className="mb-3">Delimiter</Label>
        <div className="flex flex-col gap-2">
          {DELIMITERS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="delimiter"
                value={value}
                checked={config.delimiter === value}
                onChange={(e) => onChange({ ...config, delimiter: e.target.value })}
                className="cursor-pointer"
              />
              <Text size="small">{label}</Text>
            </label>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="quote_char" className="mb-2">
            Quote Character
          </Label>
          <Input
            id="quote_char"
            value={config.quote_char}
            onChange={(e) => onChange({ ...config, quote_char: e.target.value })}
            maxLength={1}
          />
        </div>

        <div>
          <Label htmlFor="skip_rows" className="mb-2">
            Skip Rows
          </Label>
          <Input
            id="skip_rows"
            type="number"
            min={0}
            value={config.skip_rows}
            onChange={(e) => onChange({ ...config, skip_rows: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="has_header"
          checked={config.has_header}
          onCheckedChange={(checked) => onChange({ ...config, has_header: checked })}
        />
        <Label htmlFor="has_header" className="cursor-pointer">
          File has header row
        </Label>
      </div>

      {/* Parsed Preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Parsed Preview (First 5 Rows)</Label>
          {isLoading && (
            <Badge size="small" color="blue">Loading...</Badge>
          )}
        </div>

        {error && (
          <div className="bg-ui-bg-error-subtle border border-ui-border-error p-3 rounded-lg mb-3">
            <Text size="small" className="text-ui-fg-error">{error}</Text>
          </div>
        )}

        {previewData && !error && (
          <>
            <div className="overflow-x-auto border border-ui-border-base rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-ui-bg-subtle">
                  <tr>
                    {previewData.detected_columns.map((col, idx) => (
                      <th key={idx} className="px-4 py-2 text-left font-medium border-b border-ui-border-base">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.preview_rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-ui-border-base last:border-b-0">
                      {previewData.detected_columns.map((col, colIdx) => (
                        <td key={colIdx} className="px-4 py-2">
                          {row[col] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-4 mt-3">
              <Badge size="small" color="green">
                {previewData.detected_columns.length} columns detected
              </Badge>
              {previewData.warnings.length > 0 && (
                <Badge size="small" color="orange">
                  {previewData.warnings.length} warnings
                </Badge>
              )}
            </div>

            {previewData.warnings.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-ui-fg-subtle hover:text-ui-fg-base">
                  View warnings
                </summary>
                <div className="mt-2 space-y-1">
                  {previewData.warnings.map((warning, idx) => (
                    <Text key={idx} size="xsmall" className="text-ui-fg-subtle">
                      • {warning}
                    </Text>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Fixed-Width Configuration Sub-component
interface FixedWidthConfigurationProps {
  columns: Array<{ name: string; start: number; width: number }>
  onColumnsChange: (columns: Array<{ name: string; start: number; width: number }>) => void
  skipRows: number
  onSkipRowsChange: (skip: number) => void
  fileContent: string
  previewData: PreviewData | null
  isLoading: boolean
  error: string | null
}

function FixedWidthConfiguration({
  columns,
  onColumnsChange,
  skipRows,
  onSkipRowsChange,
  fileContent,
  previewData,
  isLoading,
  error,
}: FixedWidthConfigurationProps) {
  const lines = fileContent.split('\n').slice(0, 5)

  const addColumn = () => {
    const newStart = columns.length > 0
      ? columns[columns.length - 1].start + columns[columns.length - 1].width
      : 0

    onColumnsChange([
      ...columns,
      {
        name: `col_${columns.length + 1}`,
        start: newStart,
        width: 10,
      },
    ])
  }

  const removeColumn = (index: number) => {
    onColumnsChange(columns.filter((_, idx) => idx !== index))
  }

  const updateColumn = (index: number, updates: Partial<{ name: string; start: number; width: number }>) => {
    onColumnsChange(
      columns.map((col, idx) => (idx === index ? { ...col, ...updates } : col))
    )
  }

  const autoDetectColumns = () => {
    // Simple auto-detection: find whitespace patterns
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
    <div className="flex flex-col gap-6 py-6">
      {/* Instructions */}
      <div className="bg-ui-bg-subtle p-4 rounded-lg border border-ui-border-base">
        <Text size="small" className="text-ui-fg-subtle">
          Define column boundaries by specifying start position and width for each column.
          You can also use auto-detection to get started.
        </Text>
      </div>

      {/* File Preview */}
      <div>
        <Label className="mb-2">File Preview (First 5 Lines)</Label>
        <pre className="bg-ui-bg-subtle p-4 rounded-lg text-xs font-mono overflow-x-auto border border-ui-border-base">
          {lines.map((line, idx) => (
            <div key={idx}>{line || ' '}</div>
          ))}
        </pre>
      </div>

      {/* Skip Rows */}
      <div className="max-w-xs">
        <Label htmlFor="skip_rows_fw" className="mb-2">
          Skip Rows
        </Label>
        <Input
          id="skip_rows_fw"
          type="number"
          min={0}
          value={skipRows}
          onChange={(e) => onSkipRowsChange(parseInt(e.target.value) || 0)}
        />
      </div>

      {/* Column Definitions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Defined Columns ({columns.length})</Label>
          <Button size="small" variant="secondary" onClick={autoDetectColumns}>
            Auto-detect Columns
          </Button>
        </div>

        {columns.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-ui-border-base rounded-lg">
            <Text size="small" className="text-ui-fg-subtle">
              No columns defined yet. Click "Add Column" to start.
            </Text>
          </div>
        ) : (
          <div className="space-y-3">
            {columns.map((col, idx) => (
              <div key={idx} className="border border-ui-border-base rounded-lg p-4 bg-ui-bg-subtle">
                <div className="grid grid-cols-4 gap-3 items-end">
                  <div className="col-span-2">
                    <Label className="mb-2">Column Name</Label>
                    <Input
                      value={col.name}
                      onChange={(e) => updateColumn(idx, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="mb-2">Start</Label>
                    <Input
                      type="number"
                      min={0}
                      value={col.start}
                      onChange={(e) => updateColumn(idx, { start: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label className="mb-2">Width</Label>
                    <Input
                      type="number"
                      min={1}
                      value={col.width}
                      onChange={(e) => updateColumn(idx, { width: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() => removeColumn(idx)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button className="mt-3" size="small" variant="secondary" onClick={addColumn}>
          + Add Column
        </Button>
      </div>

      {/* Parsed Preview */}
      {columns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label>Parsed Preview (First 5 Rows)</Label>
            {isLoading && (
              <Badge size="small" color="blue">Loading...</Badge>
            )}
          </div>

          {error && (
            <div className="bg-ui-bg-error-subtle border border-ui-border-error p-3 rounded-lg mb-3">
              <Text size="small" className="text-ui-fg-error">{error}</Text>
            </div>
          )}

          {previewData && !error && (
            <div className="overflow-x-auto border border-ui-border-base rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-ui-bg-subtle">
                  <tr>
                    {previewData.detected_columns.map((col, idx) => (
                      <th key={idx} className="px-4 py-2 text-left font-medium border-b border-ui-border-base">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.preview_rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-ui-border-base last:border-b-0">
                      {previewData.detected_columns.map((col, colIdx) => (
                        <td key={colIdx} className="px-4 py-2">
                          {row[col] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
