import { MedusaRequest } from "@medusajs/framework/http"
import { Context } from "@medusajs/framework/types"

export interface I18nContext {
  language: string
  region?: string
}

/**
 * Extract language preference from request headers
 * Supports both Accept-Language header and custom language header
 */
export function getLanguageFromRequest(req: MedusaRequest): string {
  // First check for custom language header (set by admin)
  const customLang = req.headers["x-medusa-language"] as string
  if (customLang) {
    return customLang
  }

  // Check Accept-Language header
  const acceptLanguage = req.headers["accept-language"] as string
  if (acceptLanguage) {
    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,fr;q=0.8")
    const languages = acceptLanguage
      .split(",")
      .map(lang => {
        const [code, quality] = lang.trim().split(";q=")
        return {
          code: code.split("-")[0], // Get just the language part (en from en-US)
          quality: quality ? parseFloat(quality) : 1.0
        }
      })
      .sort((a, b) => b.quality - a.quality)
    
    return languages[0]?.code || "en"
  }

  // Default to English
  return "en"
}

/**
 * Get supported languages list
 * Based on Belgium market focus, prioritize Dutch, French, German, and English
 */
export function getSupportedLanguages(): string[] {
  return ["nl", "fr", "de", "en"] // Dutch, French, German, English for Belgium
}

/**
 * Validate and normalize language code
 */
export function normalizeLanguage(lang: string): string {
  const supported = getSupportedLanguages()
  const normalized = (lang || "en").toLowerCase().split("-")[0] // Extract language part only
  
  return supported.includes(normalized) ? normalized : "en"
}

/**
 * Create internationalization context for modules
 */
export function createI18nContext(req: MedusaRequest): I18nContext {
  const language = normalizeLanguage(getLanguageFromRequest(req))
  
  return {
    language,
    region: "BE" // Belgium focus
  }
}

/**
 * Translation helper for custom modules
 * This is a simple implementation - you can extend this to use proper i18n libraries
 */
export interface TranslationMap {
  [key: string]: {
    [language: string]: string
  }
}

export class ModuleTranslator {
  private translations: TranslationMap = {}

  constructor(translations: TranslationMap = {}) {
    this.translations = translations
  }

  addTranslations(translations: TranslationMap) {
    this.translations = { ...this.translations, ...translations }
  }

  translate(key: string, language: string, fallback?: string): string {
    const translation = this.translations[key]?.[language] 
      || this.translations[key]?.["en"] 
      || fallback 
      || key
    
    return translation
  }

  t(key: string, language: string, fallback?: string): string {
    return this.translate(key, language, fallback)
  }
} 