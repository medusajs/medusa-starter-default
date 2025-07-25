import { useTranslation as useOriginalTranslation } from "react-i18next"
import { customTranslations } from "../translations"

type TranslationValue = string | { [key: string]: TranslationValue }

export const useCustomTranslation = () => {
  const { t: originalT, i18n, ...rest } = useOriginalTranslation()
  
  const t = (key: string, options?: Record<string, any>): string => {
    // Check if it's a custom translation key
    if (key.startsWith("custom.")) {
      const currentLanguage = i18n.language || "en"
      const supportedLanguage = (currentLanguage === "en" || currentLanguage === "nl") ? currentLanguage : "en"
      
      try {
        const keys = key.split(".")
        let value: TranslationValue = customTranslations[supportedLanguage as keyof typeof customTranslations]
        
        for (const k of keys) {
          if (typeof value === "object" && value !== null && k in value) {
            value = value[k]
          } else {
            throw new Error(`Key not found: ${k}`)
          }
        }
        
        if (typeof value === "string") {
          // Simple interpolation for {{variable}} patterns
          if (options && typeof options === "object") {
            return value.replace(/\{\{(\w+)\}\}/g, (match: string, varName: string) => {
              return options[varName] || match
            })
          }
          return value
        }
      } catch (error) {
        console.warn(`Translation key not found: ${key}`)
      }
      
      // Fallback to English if translation not found
      if (supportedLanguage !== "en") {
        try {
          const keys = key.split(".")
          let value: TranslationValue = customTranslations.en
          
          for (const k of keys) {
            if (typeof value === "object" && value !== null && k in value) {
              value = value[k]
            } else {
              throw new Error(`Key not found: ${k}`)
            }
          }
          
          if (typeof value === "string") {
            if (options && typeof options === "object") {
              return value.replace(/\{\{(\w+)\}\}/g, (match: string, varName: string) => {
                return options[varName] || match
              })
            }
            return value
          }
        } catch (error) {
          console.warn(`Translation key not found in fallback: ${key}`)
        }
      }
      
      // Return key if no translation found
      return key
    }
    
    // Use original translation for non-custom keys - ensure we return a string
    const result = originalT(key, options)
    return typeof result === "string" ? result : String(result)
  }
  
  return { t, i18n, ...rest }
} 