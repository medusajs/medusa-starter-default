/**
 * CRITICAL FIX: Pre-initialize i18next to prevent crashes in @medusajs/dashboard
 *
 * The dashboard's promotions module calls i18n.t().toLowerCase() at module load time,
 * before i18next is initialized. This causes undefined.toLowerCase() crashes.
 *
 * By initializing i18next synchronously here (before dashboard imports),
 * we ensure i18n.t() always returns a string, preventing the crash.
 *
 * See: https://github.com/medusajs/medusa/issues/[related-issue]
 */
import i18next from 'i18next'

// Initialize i18next immediately if not already initialized
if (!i18next.isInitialized) {
  i18next.init({
    fallbackLng: 'en',
    lng: 'en',
    resources: {
      en: {
        translation: {}
      }
    },
    // CRITICAL: Return the key itself when translation is missing
    // This ensures i18n.t("statuses.scheduled") returns "statuses.scheduled" (a string)
    // instead of undefined, making .toLowerCase() work
    returnNull: false,
    returnEmptyString: false,
    // Silent mode to avoid console spam during bootstrap
    debug: false,
    interpolation: {
      escapeValue: false
    }
  })
}

// Admin customizations are automatically discovered from the routes directory