// Lightweight helpers to safely parse Express/Medusa query params

type UnknownQuery = unknown

export function toStringOrUndefined(value: UnknownQuery): string | undefined {
  if (typeof value === "string") return value
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
    return value[0] as string
  }
  return undefined
}

export function toStringArray(value: UnknownQuery): string[] {
  if (!value) return []
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : undefined))
      .filter((v): v is string => typeof v === "string")
  }
  return []
}

export function csvToArray(value: UnknownQuery, fallback: string[]): string[] {
  const str = toStringOrUndefined(value)
  if (!str) return fallback
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

export function toNumberOrDefault(value: UnknownQuery, defaultValue: number): number {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : defaultValue
  }
  return defaultValue
}

