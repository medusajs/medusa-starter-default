import crypto from "node:crypto"

import {
  signEmailVerifyToken,
  verifyEmailVerifyToken,
} from "../email-verify-token"

const SECRET = "unit-test-secret-email-verify"
const HOUR = 60 * 60 * 1000

// Re-implementation of the first token version (pre-refactor, see git history
// of src/utils/email-verify-token.ts). Links from those mails must stay valid.
function legacySign(customerId: string, email: string, issuedAtMs: number): string {
  const payload = Buffer.from(
    `${customerId}:${email.toLowerCase()}:${issuedAtMs}`
  ).toString("base64url")
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(`email-verify:${payload}`)
    .digest("base64url")
  return `${payload}.${sig}`
}

// Signs an arbitrary payload with the real key, to reach the checks that run
// after the signature check.
function signRaw(decodedPayload: string): string {
  const payload = Buffer.from(decodedPayload).toString("base64url")
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(`email-verify:${payload}`)
    .digest("base64url")
  return `${payload}.${sig}`
}

describe("email-verify-token", () => {
  const originalSecret = process.env.JWT_SECRET

  beforeEach(() => {
    process.env.JWT_SECRET = SECRET
  })

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret
  })

  it("roundtrips customer id, normalized email and issue time", () => {
    const issuedAt = Date.now() - 1000
    const token = signEmailVerifyToken("cus_1", "  Jane.Doe@Example.COM ", issuedAt)

    expect(verifyEmailVerifyToken("cus_1", "jane.doe@example.com", token)).toEqual({
      ok: true,
      customerId: "cus_1",
      email: "jane.doe@example.com",
      issuedAtMs: issuedAt,
    })
    // Email comparison is case/whitespace-insensitive on the verify side too
    expect(verifyEmailVerifyToken("cus_1", " JANE.DOE@example.com", token).ok).toBe(true)
  })

  it("supports emails containing ':'", () => {
    const email = "\"we:ird\"@example.com"
    const token = signEmailVerifyToken("cus_1", email)

    const result = verifyEmailVerifyToken("cus_1", email, token)
    expect(result).toEqual(
      expect.objectContaining({ ok: true, customerId: "cus_1", email })
    )
  })

  it("still accepts tokens produced by the legacy implementation", () => {
    const issuedAt = Date.now() - HOUR
    const token = legacySign("cus_legacy", "Legacy@Example.com", issuedAt)

    expect(verifyEmailVerifyToken("cus_legacy", "legacy@example.com", token)).toEqual({
      ok: true,
      customerId: "cus_legacy",
      email: "legacy@example.com",
      issuedAtMs: issuedAt,
    })
    // and the current signer still produces the exact same format
    expect(signEmailVerifyToken("cus_legacy", "Legacy@Example.com", issuedAt)).toEqual(token)
  })

  it("expires after 24h by default", () => {
    const fresh = signEmailVerifyToken("cus_1", "a@b.de", Date.now() - 23 * HOUR)
    const stale = signEmailVerifyToken("cus_1", "a@b.de", Date.now() - 25 * HOUR)

    expect(verifyEmailVerifyToken("cus_1", "a@b.de", fresh).ok).toBe(true)
    expect(verifyEmailVerifyToken("cus_1", "a@b.de", stale)).toEqual({
      ok: false,
      reason: "expired",
    })
  })

  it("honours a custom maxAge", () => {
    const token = signEmailVerifyToken("cus_1", "a@b.de", Date.now() - 2 * HOUR)

    expect(verifyEmailVerifyToken("cus_1", "a@b.de", token, HOUR)).toEqual({
      ok: false,
      reason: "expired",
    })
    expect(verifyEmailVerifyToken("cus_1", "a@b.de", token, 3 * HOUR).ok).toBe(true)
  })

  it("tolerates small clock skew but rejects tokens issued far in the future", () => {
    const skewed = signEmailVerifyToken("cus_1", "a@b.de", Date.now() + 60 * 1000)
    const future = signEmailVerifyToken("cus_1", "a@b.de", Date.now() + HOUR)

    expect(verifyEmailVerifyToken("cus_1", "a@b.de", skewed).ok).toBe(true)
    expect(verifyEmailVerifyToken("cus_1", "a@b.de", future)).toEqual({
      ok: false,
      reason: "expired",
    })
  })

  it("rejects a tampered payload or signature", () => {
    const token = signEmailVerifyToken("cus_1", "a@b.de")
    const [payload, sig] = token.split(".")

    const otherPayload = Buffer.from(
      `cus_2:a@b.de:${Date.now()}`
    ).toString("base64url")
    expect(verifyEmailVerifyToken("cus_2", "a@b.de", `${otherPayload}.${sig}`)).toEqual({
      ok: false,
      reason: "signature",
    })

    const flipped = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A")
    expect(verifyEmailVerifyToken("cus_1", "a@b.de", `${payload}.${flipped}`)).toEqual({
      ok: false,
      reason: "signature",
    })
    expect(verifyEmailVerifyToken("cus_1", "a@b.de", `${payload}.${sig}x`)).toEqual({
      ok: false,
      reason: "signature",
    })
  })

  it("rejects a valid token for another customer or email", () => {
    const token = signEmailVerifyToken("cus_1", "a@b.de")

    expect(verifyEmailVerifyToken("cus_2", "a@b.de", token)).toEqual({
      ok: false,
      reason: "signature",
    })
    expect(verifyEmailVerifyToken("cus_1", "other@b.de", token)).toEqual({
      ok: false,
      reason: "signature",
    })
  })

  it("rejects tokens signed with a different secret", () => {
    const token = signEmailVerifyToken("cus_1", "a@b.de")
    process.env.JWT_SECRET = "rotated-secret"

    expect(verifyEmailVerifyToken("cus_1", "a@b.de", token)).toEqual({
      ok: false,
      reason: "signature",
    })
  })

  it.each([
    ["empty", ""],
    ["no separator", "abcdef"],
    ["too many parts", "a.b.c"],
    ["empty payload", ".sig"],
    ["empty signature", "payload."],
  ])("rejects malformed tokens (%s)", (_, token) => {
    expect(verifyEmailVerifyToken("cus_1", "a@b.de", token)).toEqual({
      ok: false,
      reason: "malformed",
    })
  })

  it("rejects correctly signed but structurally invalid payloads", () => {
    expect(verifyEmailVerifyToken("cus_1", "a@b.de", signRaw("cus_1:a@b.de:notanumber")))
      .toEqual({ ok: false, reason: "malformed" })
    expect(verifyEmailVerifyToken("cus_1", "a@b.de", signRaw("cus_1:a@b.de")))
      .toEqual({ ok: false, reason: "malformed" })
    expect(verifyEmailVerifyToken("cus_1", "a@b.de", signRaw(`:a@b.de:${Date.now()}`)))
      .toEqual({ ok: false, reason: "malformed" })
    expect(verifyEmailVerifyToken("cus_1", "", signRaw(`cus_1::${Date.now()}`)))
      .toEqual({ ok: false, reason: "malformed" })
  })

  it("throws when JWT_SECRET is missing", () => {
    delete process.env.JWT_SECRET

    expect(() => signEmailVerifyToken("cus_1", "a@b.de")).toThrow(
      "JWT_SECRET is not configured"
    )
  })
})
