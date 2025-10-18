import { Container, Heading, Select, Input, Button, Label, Switch, Badge, toast } from "@medusajs/ui"
import { useState, useEffect } from "react"

interface ParserConfig {
  type: 'csv' | 'fixed-width'
  template_name?: string
  config: any
}

interface SupplierParserConfigSectionProps {
  supplierId: string
}

interface CsvConfigFormProps {
  config: ParserConfig
  onChange: (config: ParserConfig) => void
}

function CsvConfigForm({ config, onChange }: CsvConfigFormProps) {
  const csvConfig = config.config as any

  return (
    <div className="space-y-4">
      <div>
        <Label>Delimiter</Label>
        <Select
          value={csvConfig.delimiter || ','}
          onValueChange={(value) => onChange({
            ...config,
            config: { ...csvConfig, delimiter: value }
          })}
        >
          <Select.Trigger>
            <Select.Value placeholder="Select delimiter" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value=",">Comma (,)</Select.Item>
            <Select.Item value=";">Semicolon (;)</Select.Item>
            <Select.Item value="\t">Tab</Select.Item>
            <Select.Item value="|">Pipe (|)</Select.Item>
          </Select.Content>
        </Select>
      </div>

      <div>
        <Label>Quote Character</Label>
        <Input
          value={csvConfig.quote_char || '"'}
          onChange={(e) => onChange({
            ...config,
            config: { ...csvConfig, quote_char: e.target.value }
          })}
          placeholder='"'
        />
      </div>

      <div>
        <Label>Skip Rows</Label>
        <Input
          type="number"
          value={csvConfig.skip_rows || 0}
          onChange={(e) => onChange({
            ...config,
            config: { ...csvConfig, skip_rows: parseInt(e.target.value) || 0 }
          })}
          min="0"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={csvConfig.has_header ?? true}
          onCheckedChange={(checked) => onChange({
            ...config,
            config: { ...csvConfig, has_header: checked }
          })}
        />
        <Label>File has header row</Label>
      </div>
    </div>
  )
}

interface FixedWidthConfigFormProps {
  config: ParserConfig
  onChange: (config: ParserConfig) => void
}

function FixedWidthConfigForm({ config, onChange }: FixedWidthConfigFormProps) {
  const fwConfig = config.config as any

  const addColumn = () => {
    const newColumns = [...(fwConfig.fixed_width_columns || []), {
      field: '',
      start: 0,
      width: 0
    }]
    onChange({
      ...config,
      config: { ...fwConfig, fixed_width_columns: newColumns }
    })
  }

  const removeColumn = (index: number) => {
    const newColumns = fwConfig.fixed_width_columns.filter((_: any, i: number) => i !== index)
    onChange({
      ...config,
      config: { ...fwConfig, fixed_width_columns: newColumns }
    })
  }

  const updateColumn = (index: number, field: string, value: any) => {
    const newColumns = [...fwConfig.fixed_width_columns]
    newColumns[index] = { ...newColumns[index], [field]: value }
    onChange({
      ...config,
      config: { ...fwConfig, fixed_width_columns: newColumns }
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Skip Rows</Label>
        <Input
          type="number"
          value={fwConfig.skip_rows || 0}
          onChange={(e) => onChange({
            ...config,
            config: { ...fwConfig, skip_rows: parseInt(e.target.value) || 0 }
          })}
          min="0"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Column Definitions</Label>
          <Button variant="secondary" size="small" onClick={addColumn}>
            Add Column
          </Button>
        </div>

        <div className="space-y-2">
          {fwConfig.fixed_width_columns?.map((col: any, index: number) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                placeholder="Field name (e.g., supplier_sku)"
                value={col.field}
                onChange={(e) => updateColumn(index, 'field', e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Start"
                value={col.start}
                onChange={(e) => updateColumn(index, 'start', parseInt(e.target.value) || 0)}
                min="0"
                className="w-20"
              />
              <Input
                type="number"
                placeholder="Width"
                value={col.width}
                onChange={(e) => updateColumn(index, 'width', parseInt(e.target.value) || 0)}
                min="1"
                className="w-20"
              />
              <Button
                variant="secondary"
                size="small"
                onClick={() => removeColumn(index)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SupplierParserConfigSection({ supplierId }: SupplierParserConfigSectionProps) {
  const [config, setConfig] = useState<ParserConfig | null>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [useCustom, setUseCustom] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [supplierId])

  const fetchConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/admin/suppliers/${supplierId}/parser-config`)

      if (!response.ok) {
        throw new Error('Failed to fetch parser config')
      }

      const data = await response.json()
      setConfig(data.parser_config)
      setTemplates(data.available_templates)
      setUseCustom(!!data.parser_config && !data.parser_config.template_name)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/admin/suppliers/${supplierId}/parser-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save configuration')
      }

      toast.success('Parser configuration saved successfully')

    } catch (err: any) {
      setError(err.message)
      toast.error(`Failed to save configuration: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleTemplateChange = (templateId: string) => {
    if (templateId === 'none') {
      setConfig(null)
      return
    }

    const template = templates.find(t => t.id === templateId)
    if (template) {
      setConfig({
        type: template.type,
        template_name: templateId,
        config: template.config
      })
      setUseCustom(false)
    }
  }

  if (loading) {
    return (
      <Container>
        <Heading level="h2">Parser Configuration</Heading>
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="px-6 py-4 border-b">
        <Heading level="h2">Parser Configuration</Heading>
      </div>

      <div className="px-6 py-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6">
          {/* Template Selection */}
          <div>
            <Label>Parser Template</Label>
            <Select
              value={config?.template_name || 'none'}
              onValueChange={handleTemplateChange}
              disabled={useCustom}
            >
              <Select.Trigger>
                <Select.Value placeholder="Select template" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="none">Auto-detect (Default)</Select.Item>
                {templates.map(template => (
                  <Select.Item key={template.id} value={template.id}>
                    {template.name} ({template.type})
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <div className="text-sm text-gray-500 mt-1">
              Select a pre-configured template or use custom configuration
            </div>
          </div>

          {/* Custom Configuration Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={useCustom}
              onCheckedChange={setUseCustom}
            />
            <Label>Use custom configuration</Label>
          </div>

          {/* Current Configuration Display */}
          {config && (
            <div>
              <Label>Current Configuration</Label>
              <div className="mt-2 p-3 bg-gray-50 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge color="blue">{config.type}</Badge>
                  {config.template_name && (
                    <Badge color="green">{config.template_name}</Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {config.type === 'csv' ? (
                    <div>
                      <div>Delimiter: {config.config.delimiter}</div>
                      <div>Has Header: {config.config.has_header ? 'Yes' : 'No'}</div>
                      <div>Skip Rows: {config.config.skip_rows}</div>
                    </div>
                  ) : (
                    <div>
                      <div>Skip Rows: {config.config.skip_rows}</div>
                      <div>Columns: {config.config.fixed_width_columns?.length || 0}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Custom Configuration Forms */}
          {useCustom && config && (
            <div>
              <Label>Custom Configuration</Label>
              <div className="mt-2">
                {config.type === 'csv' ? (
                  <CsvConfigForm config={config} onChange={setConfig} />
                ) : (
                  <FixedWidthConfigForm config={config} onChange={setConfig} />
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || !config}
              isLoading={saving}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button
              variant="secondary"
              onClick={fetchConfig}
              disabled={loading}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </Container>
  )
}
