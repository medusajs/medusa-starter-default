# Internationalization for Custom Modules

This guide explains how your custom modules adapt to the language preferences users select in their profile settings.

## Overview

The internationalization (i18n) system enables your custom modules to:
- Automatically detect user language preferences from the admin panel
- Provide localized content and messages
- Support multiple languages for Belgian market (Dutch, French, German, English)
- Fallback to English when translations are missing

## Supported Languages

Based on Belgium market focus:
- `nl` - Dutch (Nederlands)
- `fr` - French (Français) 
- `de` - German (Deutsch)
- `en` - English (default/fallback)

## How It Works

### 1. Language Detection Priority

The system detects language preferences in this order:
1. **Query parameter**: `?lang=nl`
2. **Custom header**: `x-medusa-language: nl`
3. **Accept-Language header**: From browser/client
4. **User metadata**: Stored language preference
5. **Default**: English (`en`)

### 2. Setting User Language Preference

Users can set their language preference in the admin panel under Profile settings. This preference is stored and automatically applied to API responses.

## Using i18n in Your Custom Modules

### Step 1: Create Translation Files

Create a `translations.ts` file in your module directory:

```typescript
// src/modules/your-module/translations.ts
import { TranslationMap } from "../../utils/i18n-helper"

export const yourModuleTranslations: TranslationMap = {
  "module.field.name": {
    en: "Name",
    nl: "Naam",
    fr: "Nom",
    de: "Name",
  },
  "module.action.create": {
    en: "Create Item",
    nl: "Item aanmaken",
    fr: "Créer un élément",
    de: "Element erstellen",
  },
  "module.message.created": {
    en: "Item created successfully",
    nl: "Item succesvol aangemaakt",
    fr: "Élément créé avec succès",
    de: "Element erfolgreich erstellt",
  },
}
```

### Step 2: Update Your Module Service

Add i18n support to your service:

```typescript
// src/modules/your-module/service.ts
import { ModuleTranslator, I18nContext } from "../../utils/i18n-helper"
import { yourModuleTranslations } from "./translations"

export default class YourModuleService extends MedusaService({
  YourModel,
}) {
  private translator: ModuleTranslator

  constructor(dependencies, moduleDeclaration) {
    super(...arguments)
    this.translator = new ModuleTranslator(yourModuleTranslations)
  }

  private t(key: string, language: string = "en", fallback?: string): string {
    return this.translator.translate(key, language, fallback)
  }

  async createItemWithI18n(
    data: CreateItemDTO,
    i18nContext: I18nContext,
    sharedContext: Context = {}
  ): Promise<ItemDTO> {
    // Validation with localized error messages
    if (!data.name) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        this.t("module.validation.name_required", i18nContext.language)
      )
    }

    const [item] = await this.createItems([data], sharedContext)
    return item
  }
}
```

### Step 3: Update API Routes

Use the i18n helper in your API routes:

```typescript
// src/api/admin/your-module/route.ts
import { createI18nContext } from "../../../utils/i18n-helper"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const moduleService = req.scope.resolve("yourModule")
  const i18nContext = createI18nContext(req)
  
  const item = await moduleService.createItemWithI18n(
    req.body,
    i18nContext
  )
  
  const successMessage = moduleService.t(
    "module.message.created",
    i18nContext.language
  )
  
  res.json({
    item,
    message: successMessage,
    language: i18nContext.language,
  })
}
```

## Language Detection in Frontend

### Admin Panel Integration

The admin panel automatically sends the user's language preference in headers. Your custom modules will automatically use this preference.

### Manual Language Override

You can override the language for specific requests:

```javascript
// Add query parameter
fetch('/admin/your-module?lang=nl')

// Add header
fetch('/admin/your-module', {
  headers: {
    'x-medusa-language': 'nl'
  }
})
```

## Examples

### Machine Module Example

```typescript
// Get machine with localized status
const machine = await machinesService.getMachineWithLocalizedData(
  "machine_123",
  { language: "nl" }
)

console.log(machine.localizedStatus) // "Actief" (instead of "Active")
```

### Error Messages

```typescript
// English user sees:
"Machine model is required"

// Dutch user sees:
"Machine model is verplicht"

// French user sees:
"Le modèle de machine est requis"
```

## Best Practices

### 1. Translation Key Naming

Use a consistent naming convention:
- `module.field.fieldname` - Field labels
- `module.action.actionname` - Action buttons/links
- `module.message.messagetype` - Success/info messages
- `module.validation.rulename` - Validation error messages

### 2. Always Provide Fallbacks

```typescript
this.t("module.field.name", language, "Default Name")
```

### 3. Context-Aware Translations

Some translations may need context:

```typescript
"machine.status.active": {
  en: "Active",
  nl: "Actief",
  // Add context for different meanings if needed
}
```

### 4. Date and Number Formatting

For dates and numbers, use the region information:

```typescript
const i18nContext = createI18nContext(req)
// i18nContext.region = "BE" (Belgium)
// Format dates/numbers according to Belgian standards
```

## Testing

Test your i18n implementation:

```bash
# Test with different languages
curl -H "x-medusa-language: nl" http://localhost:9000/admin/machines
curl -H "x-medusa-language: fr" http://localhost:9000/admin/machines
curl "http://localhost:9000/admin/machines?lang=de"
```

## Migration

If you have existing modules without i18n:

1. Create translation files for each module
2. Add i18n support to services gradually
3. Update API routes to use i18n context
4. Test with different languages
5. Add fallbacks for missing translations

The system is backward compatible - existing functionality will continue to work in English until you add translations. 