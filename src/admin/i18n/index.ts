import de from "./json/de.json"
import en from "./json/en.json"

// Picked up by @medusajs/admin-vite-plugin (virtual:medusa/i18n) and
// deep-merged into the dashboard's own resources, so these keys live in the
// default "translation" namespace next to the dashboard's keys. All custom
// keys are prefixed with "kiji." to avoid collisions.
export default {
  de: {
    translation: de,
  },
  en: {
    translation: en,
  },
}
