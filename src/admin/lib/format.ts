/**
 * Formats a date in the admin's current UI language.
 *
 * The dashboard uses codes like "enGB" or "ptBR" for some languages, which
 * aren't valid BCP 47 tags — they are normalized to "en-GB"/"pt-BR" first, and
 * any remaining invalid tag falls back to the browser default.
 */
export const formatDate = (value: string | Date, language: string) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
  const locale = language.replace(/^([a-z]{2})([A-Z]{2})$/, "$1-$2")

  try {
    return date.toLocaleDateString(locale, options)
  } catch {
    return date.toLocaleDateString(undefined, options)
  }
}

export const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback
