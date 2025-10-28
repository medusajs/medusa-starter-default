/**
 * Parse Raw Content Step (Preview Only)
 *
 * Parses CSV or fixed-width content without performing database lookups.
 * Used for wizard preview functionality to provide fast feedback.
 *
 * @see TEM-300 - Create Parse Preview API Endpoint
 */

import { createStep, StepResponse } from "@medusajs/workflows-sdk"

type ParseRawContentInput = {
  file_content: string
  format_type: 'csv' | 'fixed-width'
  parse_config: {
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
  column_mapping?: Record<string, string>
}

type ParseRawContentOutput = {
  items: Array<Record<string, any>>
  errors: string[]
  warnings: string[]
  total_rows: number
  processed_rows: number
}

/**
 * Parse CSV content with configurable delimiter
 */
function parseCSV(csvContent: string, delimiter: string = ',', quoteChar: string = '"'): any[] {
  const lines = csvContent.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = parseCSVLine(lines[0], delimiter, quoteChar)
  const rows: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter, quoteChar)
    const row: any = {}

    headers.forEach((header, index) => {
      row[header.trim()] = values[index] !== undefined ? values[index].trim() : ''
    })

    rows.push(row)
  }

  return rows
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string, delimiter: string, quoteChar: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === quoteChar) {
      if (inQuotes && line[i + 1] === quoteChar) {
        current += quoteChar
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}

/**
 * Extract fields from fixed-width line based on column definitions
 */
function extractFixedWidthFields(
  line: string,
  columns: Array<{ name: string, start: number, width: number }>
): Record<string, string> {
  const row: Record<string, string> = {}

  for (const column of columns) {
    const end = column.start + column.width
    const value = line.substring(column.start, end).trim()
    row[column.name] = value
  }

  return row
}

/**
 * Parse raw content step - NO database operations
 */
export const parseRawContentStep = createStep(
  "parse-raw-content-step",
  async (input: ParseRawContentInput): Promise<ParseRawContentOutput> => {
    const { file_content, format_type, parse_config, column_mapping } = input
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // Split content and handle skip_rows
      const lines = file_content.split('\n').filter(line => line.trim())
      const skipRows = parse_config.skip_rows || 0
      const contentLines = lines.slice(skipRows)

      if (contentLines.length === 0) {
        return new StepResponse({
          items: [],
          errors: ['No data rows found after skipping rows'],
          warnings: [],
          total_rows: 0,
          processed_rows: 0,
        })
      }

      let parsedRows: Array<Record<string, any>> = []

      // Parse based on format type
      if (format_type === 'csv') {
        const delimiter = parse_config.delimiter || ','
        const quoteChar = parse_config.quote_char || '"'

        // Parse CSV
        const csvData = parseCSV(contentLines.join('\n'), delimiter, quoteChar)
        parsedRows = csvData

      } else if (format_type === 'fixed-width') {
        // Validate fixed-width columns
        if (!parse_config.fixed_width_columns || parse_config.fixed_width_columns.length === 0) {
          return new StepResponse({
            items: [],
            errors: ['Fixed-width format requires column definitions'],
            warnings: [],
            total_rows: 0,
            processed_rows: 0,
          })
        }

        // Skip header if has_header is true
        const dataLines = parse_config.has_header ? contentLines.slice(1) : contentLines

        // Parse each line using column definitions
        parsedRows = dataLines.map(line =>
          extractFixedWidthFields(line, parse_config.fixed_width_columns!)
        )
      }

      // Apply column mapping if provided
      let mappedRows = parsedRows
      if (column_mapping && Object.keys(column_mapping).length > 0) {
        mappedRows = parsedRows.map(row => {
          const mappedRow: Record<string, any> = {}

          for (const [sourceColumn, targetField] of Object.entries(column_mapping)) {
            if (targetField && row[sourceColumn] !== undefined) {
              mappedRow[targetField] = row[sourceColumn]
            }
          }

          return mappedRow
        })
      }

      // Limit to first 10 rows for preview
      const previewRows = mappedRows.slice(0, 10)

      // Basic validation warnings
      if (parsedRows.length > 0) {
        const firstRow = parsedRows[0]
        const columnCount = Object.keys(firstRow).length

        if (columnCount === 0) {
          warnings.push('No columns detected in parsed data')
        }

        if (columnCount === 1) {
          warnings.push('Only 1 column detected - check delimiter configuration')
        }
      }

      return new StepResponse({
        items: previewRows,
        errors,
        warnings,
        total_rows: parsedRows.length,
        processed_rows: previewRows.length,
      })

    } catch (error: any) {
      return new StepResponse({
        items: [],
        errors: [`Failed to parse file: ${error.message}`],
        warnings: [],
        total_rows: 0,
        processed_rows: 0,
      })
    }
  },
  // No compensation needed for preview-only step
  async () => {
    return new StepResponse(void 0, {})
  }
)
