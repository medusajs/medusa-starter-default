// Masks an email for logs: "fabian@example.com" -> "f***@e***.com".
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "<none>"
  const at = email.lastIndexOf("@")
  if (at <= 0) return "***"
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  const dot = domain.lastIndexOf(".")
  const host = dot > 0 ? domain.slice(0, dot) : domain
  const tld = dot > 0 ? domain.slice(dot) : ""
  return `${local[0]}***@${host[0] ?? ""}***${tld}`
}
