import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { normalizeLanguage } from "../../utils/i18n-helper"

/**
 * Middleware to extract and set language preference for API requests
 * This middleware looks for language preferences from:
 * 1. Query parameter (?lang=nl)
 * 2. Request header (x-medusa-language)
 * 3. Accept-Language header
 * 4. User metadata/preferences (if authenticated)
 */
export async function languageMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    let language = "en" // default

    // 1. Check query parameter first (highest priority)
    if (req.query.lang && typeof req.query.lang === "string") {
      language = normalizeLanguage(req.query.lang)
    }
    // 2. Check custom header
    else if (req.headers["x-medusa-language"]) {
      language = normalizeLanguage(req.headers["x-medusa-language"] as string)
    }
    // 3. Check Accept-Language header
    else if (req.headers["accept-language"]) {
      const acceptLanguage = req.headers["accept-language"] as string
      const languages = acceptLanguage
        .split(",")
        .map(lang => {
          const [code] = lang.trim().split(";")
          return code.split("-")[0] // Get just the language part
        })
      language = normalizeLanguage(languages[0] || "en")
    }
    // 4. Try to get user preferences if user is authenticated
    else if ((req as any).user?.id) {
      try {
        // This would work if you have user preferences stored
        // For now, we'll use a simple approach with user metadata
        const userService = req.scope.resolve("user") as any
        if (userService && (req as any).user?.id) {
          const user = await userService.retrieve((req as any).user.id)
          if (user?.metadata?.language) {
            language = normalizeLanguage(user.metadata.language as string)
          }
        }
      } catch (error) {
        // Silently fail and use default language
        console.warn("Could not retrieve user language preference:", (error as any)?.message)
      }
    }

    // Set the resolved language in headers for downstream use
    req.headers["x-medusa-language"] = language
    
    // Also make it available as a property on the request
    ;(req as any).language = language

    next()
  } catch (error) {
    console.error("Language middleware error:", error)
    next() // Continue even if language detection fails
  }
}

/**
 * Utility to get language from request (for use in route handlers)
 */
export function getRequestLanguage(req: MedusaRequest): string {
  return (req.headers["x-medusa-language"] as string) || (req as any).language || "en"
} 