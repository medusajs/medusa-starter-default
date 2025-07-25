# Custom Module Internationalization (i18n)

This directory contains translation files and infrastructure for internationalizing custom MedusaJS admin modules.

## Overview

The i18n system provides translation support for custom modules across English and Dutch (Belgian market focus). All hardcoded strings in custom modules have been replaced with translation keys.

## Structure

```
src/admin/translations/
├── en.json           # English translations
├── nl.json           # Dutch translations
├── index.ts          # Translation exports
└── README.md         # This file
```

## Translation Hook

Use the `useCustomTranslation` hook in your components:

```typescript
import { useCustomTranslation } from "../../hooks/use-custom-translation"

const MyComponent = () => {
  const { t } = useCustomTranslation()
  
  return <Text>{t("custom.machines.title")}</Text> // "Machines" or "Machines"
}
```

## Translation Key Naming Convention

- `custom.general.*` - Common terms (active, inactive, edit, delete, etc.)
- `custom.machines.*` - Machine-specific terms
- `custom.suppliers.*` - Supplier-specific terms
- `custom.technicians.*` - Technician-specific terms
- `custom.serviceOrders.*` - Service order-specific terms
- `custom.invoices.*` - Invoice-specific terms
- `custom.purchaseOrders.*` - Purchase order-specific terms
- `custom.brands.*` - Brand-specific terms

## Language Detection

The system automatically detects the user's language preference from the MedusaJS admin panel and applies translations accordingly. Fallback to English if Dutch translation is missing.

## Completed Modules

✅ **Machines**: All filters, columns, actions, status badges
✅ **Suppliers**: All components fully translated
✅ **Technicians**: Departments, certifications, statuses, actions
✅ **Invoices**: Status badges, type badges, filters, columns (replaced hardcoded Dutch)

## Navigation Labels (Future Enhancement)

Currently, navigation labels in the sidebar use static route configuration labels due to MedusaJS limitations. To implement dynamic navigation translation in the future:

1. Create a custom navigation provider
2. Override the default NavItem component
3. Map route paths to translation keys
4. Inject translations into the navigation system

Example implementation approach:

```typescript
// Future enhancement
const navigationTranslations = {
  "/machines": "custom.machines.title",
  "/suppliers": "custom.suppliers.title",
  "/technicians": "custom.technicians.title",
  "/invoices": "custom.invoices.title",
}

const TranslatedNavItem = ({ path, ...props }) => {
  const { t } = useCustomTranslation()
  const translationKey = navigationTranslations[path]
  
  return (
    <NavItem 
      {...props} 
      label={translationKey ? t(translationKey) : props.label}
    />
  )
}
```

## Adding New Translations

1. Add the key to both `en.json` and `nl.json`
2. Use consistent naming conventions
3. Test with language switching in admin panel
4. Ensure fallback behavior works correctly

## Testing

To test translations:
1. Start development server
2. Change language in admin profile settings
3. Navigate to custom module pages
4. Verify all text translates correctly
5. Test fallback behavior (temporarily remove Dutch keys) 