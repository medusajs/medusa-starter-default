/**
 * Step 1: File Upload Component
 *
 * Handles file selection via drag-and-drop or click-to-browse.
 * Validates file type, size, and content before proceeding.
 *
 * @see TEM-302 - Frontend: Build Step 1 - File Upload Component
 */

import { useState, useRef, DragEvent } from "react"
import { Button, Text, Badge, toast } from "@medusajs/ui"
import { ArrowUpTray, XCircle, CheckCircle, ArrowPath } from "@medusajs/icons"

interface Step1FileUploadProps {
  onFileSelected: (file: File, content: string) => void
  onNext: () => void
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

export function Step1FileUpload({
  onFileSelected,
  onNext,
  selectedFile,
  fileContent,
}: Step1FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const validateFile = (file: File): boolean => {
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
  }

  const readFile = async (file: File) => {
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
  }

  const handleFileSelect = async (file: File) => {
    if (!validateFile(file)) {
      return
    }

    await readFile(file)
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleBrowseClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveFile = () => {
    setFileInfo(null)
    onFileSelected(null as any, null as any)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleChangeFile = () => {
    handleRemoveFile()
    setTimeout(() => {
      fileInputRef.current?.click()
    }, 100)
  }

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
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <CheckCircle className="text-ui-fg-on-color bg-ui-tag-green-icon rounded-full" />
              </div>
              <div>
                <Text weight="plus" className="mb-1">
                  {fileInfo.name}
                </Text>
                <Badge size="small" color="green">
                  Ready
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <Text size="xsmall" className="text-ui-fg-subtle mb-1">
                Size
              </Text>
              <Text size="small">
                {formatFileSize(fileInfo.size)}
              </Text>
            </div>
            <div>
              <Text size="xsmall" className="text-ui-fg-subtle mb-1">
                Type
              </Text>
              <Text size="small">
                {fileInfo.type || 'text/plain'}
              </Text>
            </div>
            <div>
              <Text size="xsmall" className="text-ui-fg-subtle mb-1">
                Lines
              </Text>
              <Text size="small">
                ~{fileInfo.lineCount.toLocaleString()}
              </Text>
            </div>
            <div>
              <Text size="xsmall" className="text-ui-fg-subtle mb-1">
                Encoding
              </Text>
              <Text size="small">
                {fileInfo.encoding}
              </Text>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="small"
              variant="secondary"
              onClick={handleChangeFile}
            >
              Change File
            </Button>
            <Button
              size="small"
              variant="danger"
              onClick={handleRemoveFile}
            >
              <XCircle />
              Remove
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
