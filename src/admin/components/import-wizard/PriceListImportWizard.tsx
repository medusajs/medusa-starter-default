/**
 * Price List Import Wizard Container
 *
 * Orchestrates the 3-step import flow using Medusa's FocusModal and ProgressTabs.
 * Manages wizard state and coordinates between steps.
 *
 * @see TEM-305 - Frontend: Build Main Wizard Container with ProgressTabs
 */

import { useState } from "react"
import { FocusModal, Heading, ProgressTabs, toast } from "@medusajs/ui"
import { Step1FileUpload } from "./Step1FileUpload"
import { Step2ParseConfiguration, ParseConfig, PreviewData } from "./Step2ParseConfiguration"
import { Step3FieldMapping, ColumnMapping } from "./Step3FieldMapping"

interface PriceListImportWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId: string
  onImportComplete: () => void
}

interface WizardState {
  currentStep: 'upload' | 'configure' | 'mapping'

  // Step 1 data
  file: File | null
  fileContent: string | null
  fileName: string

  // Step 2 data
  parseConfig: ParseConfig | null
  previewData: PreviewData | null

  // Step 3 data
  columnMapping: ColumnMapping | null
  saveAsTemplate: boolean
  templateName: string
  templateDescription: string
}

type ProgressStatus = 'not-started' | 'in-progress' | 'completed'

export function PriceListImportWizard({
  open,
  onOpenChange,
  supplierId,
  onImportComplete,
}: PriceListImportWizardProps) {
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 'upload',
    file: null,
    fileContent: null,
    fileName: '',
    parseConfig: null,
    previewData: null,
    columnMapping: null,
    saveAsTemplate: false,
    templateName: '',
    templateDescription: '',
  })

  const [isImporting, setIsImporting] = useState(false)

  // Determine step status
  const getStepStatus = (step: string): ProgressStatus => {
    const { currentStep, file, parseConfig, columnMapping } = wizardState

    // Completed steps
    if (step === 'upload' && file !== null && currentStep !== 'upload') return 'completed'
    if (step === 'configure' && parseConfig !== null && currentStep !== 'configure') return 'completed'
    if (step === 'mapping' && columnMapping !== null) return 'completed'

    // Current step
    if (step === currentStep) return 'in-progress'

    // Not started
    return 'not-started'
  }

  // Step 1: File uploaded
  const handleFileSelected = (file: File, content: string) => {
    setWizardState(prev => ({
      ...prev,
      file,
      fileContent: content,
      fileName: file.name,
    }))
  }

  const handleStep1Next = () => {
    if (!wizardState.file || !wizardState.fileContent) {
      toast.error('Please select a file first')
      return
    }
    setWizardState(prev => ({ ...prev, currentStep: 'configure' }))
  }

  // Step 2: Parse configuration completed
  const handleParseConfigured = (config: ParseConfig, preview: PreviewData) => {
    setWizardState(prev => ({
      ...prev,
      parseConfig: config,
      previewData: preview,
    }))
  }

  const handleStep2Back = () => {
    setWizardState(prev => ({ ...prev, currentStep: 'upload' }))
  }

  const handleStep2Next = () => {
    if (!wizardState.parseConfig || !wizardState.previewData) {
      toast.error('Please configure parse settings first')
      return
    }
    setWizardState(prev => ({ ...prev, currentStep: 'mapping' }))
  }

  // Step 3: Field mapping completed and import triggered
  const handleStep3Back = () => {
    setWizardState(prev => ({ ...prev, currentStep: 'configure' }))
  }

  const handleStep3Complete = async (
    mapping: ColumnMapping,
    saveAsTemplate: boolean,
    templateName?: string,
    templateDescription?: string
  ) => {
    setWizardState(prev => ({
      ...prev,
      columnMapping: mapping,
      saveAsTemplate,
      templateName: templateName || '',
      templateDescription: templateDescription || '',
    }))

    // Perform import immediately after saving state
    await performImport(mapping, saveAsTemplate, templateName, templateDescription)
  }

  // Execute the import
  const performImport = async (
    mapping: ColumnMapping,
    saveAsTemplate: boolean,
    templateName?: string,
    templateDescription?: string
  ) => {
    setIsImporting(true)

    try {
      // 1. Save template if requested
      if (saveAsTemplate && templateName) {
        try {
          const templateResponse = await fetch(
            `/admin/suppliers/${supplierId}/price-lists/import-templates`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                name: templateName,
                description: templateDescription || undefined,
                file_type: wizardState.parseConfig?.format_type === 'csv' ? 'csv' : 'txt',
                parse_config: wizardState.parseConfig,
                column_mapping: mapping,
              }),
            }
          )

          if (!templateResponse.ok) {
            const error = await templateResponse.json()
            throw new Error(error.message || 'Failed to save template')
          }

          toast.success('Template saved', {
            description: `Configuration saved as "${templateName}"`,
          })
        } catch (templateError: any) {
          // Don't fail import if template save fails
          console.error('Failed to save template:', templateError)
          toast.error('Template save failed', {
            description: 'Import will continue without saving template',
          })
        }
      }

      // 2. Perform the actual import
      const importResponse = await fetch(
        `/admin/suppliers/${supplierId}/price-lists/import`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: `Price List - ${new Date().toISOString().split('T')[0]}`,
            description: `Imported from ${wizardState.fileName}`,
            file_content: wizardState.fileContent,
            file_name: wizardState.fileName,
            parse_config: wizardState.parseConfig,
            column_mapping: mapping,
            currency_code: 'USD',
          }),
        }
      )

      if (!importResponse.ok) {
        const error = await importResponse.json()
        throw new Error(error.message || 'Import failed')
      }

      const result = await importResponse.json()

      // 3. Show success message
      toast.success('Price list imported successfully!', {
        description: `${result.import_summary?.success_count || 0} items processed`,
      })

      // 4. Close wizard and refresh parent
      resetWizard()
      onOpenChange(false)
      onImportComplete()
    } catch (error: any) {
      console.error('Import failed:', error)
      toast.error('Import failed', {
        description: error.message || 'An error occurred during import',
      })
    } finally {
      setIsImporting(false)
    }
  }

  // Reset wizard to initial state
  const resetWizard = () => {
    setWizardState({
      currentStep: 'upload',
      file: null,
      fileContent: null,
      fileName: '',
      parseConfig: null,
      previewData: null,
      columnMapping: null,
      saveAsTemplate: false,
      templateName: '',
      templateDescription: '',
    })
  }

  // Handle modal close with confirmation if in progress
  const handleClose = () => {
    // If user has made progress beyond file upload, confirm before closing
    if (wizardState.file !== null && wizardState.currentStep !== 'upload') {
      const confirmed = window.confirm(
        'Are you sure you want to cancel? Your progress will be lost.'
      )
      if (!confirmed) {
        return
      }
    }

    resetWizard()
    onOpenChange(false)
  }

  // Handle tab click - only allow going back to completed steps
  const handleTabChange = (value: string) => {
    const step = value as 'upload' | 'configure' | 'mapping'
    const status = getStepStatus(step)

    // Only allow navigation to completed or in-progress steps
    if (status === 'completed' || status === 'in-progress') {
      setWizardState(prev => ({ ...prev, currentStep: step }))
    }
  }

  return (
    <FocusModal open={open} onOpenChange={handleClose}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex flex-col gap-4">
            <Heading>Import Price List</Heading>
            <ProgressTabs value={wizardState.currentStep} onValueChange={handleTabChange}>
              <ProgressTabs.List>
                <ProgressTabs.Trigger
                  value="upload"
                  status={getStepStatus('upload')}
                  disabled={getStepStatus('upload') === 'not-started'}
                >
                  1. Upload File
                </ProgressTabs.Trigger>
                <ProgressTabs.Trigger
                  value="configure"
                  status={getStepStatus('configure')}
                  disabled={getStepStatus('configure') === 'not-started'}
                >
                  2. Configure Format
                </ProgressTabs.Trigger>
                <ProgressTabs.Trigger
                  value="mapping"
                  status={getStepStatus('mapping')}
                  disabled={getStepStatus('mapping') === 'not-started'}
                >
                  3. Map Fields
                </ProgressTabs.Trigger>
              </ProgressTabs.List>
            </ProgressTabs>
          </div>
        </FocusModal.Header>

        <FocusModal.Body className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 p-6">
            {wizardState.currentStep === 'upload' && (
              <Step1FileUpload
                onFileSelected={handleFileSelected}
                onNext={handleStep1Next}
                selectedFile={wizardState.file}
                fileContent={wizardState.fileContent}
              />
            )}

            {wizardState.currentStep === 'configure' && wizardState.fileContent && (
              <Step2ParseConfiguration
                fileContent={wizardState.fileContent}
                fileName={wizardState.fileName}
                supplierId={supplierId}
                onConfigured={handleParseConfigured}
                onBack={handleStep2Back}
                onNext={handleStep2Next}
                initialConfig={wizardState.parseConfig || undefined}
              />
            )}

            {wizardState.currentStep === 'mapping' &&
             wizardState.previewData &&
             wizardState.parseConfig && (
              <Step3FieldMapping
                parsedColumns={wizardState.previewData.detected_columns}
                parseConfig={wizardState.parseConfig}
                previewRows={wizardState.previewData.preview_rows}
                supplierId={supplierId}
                onComplete={handleStep3Complete}
                onBack={handleStep3Back}
              />
            )}
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}
