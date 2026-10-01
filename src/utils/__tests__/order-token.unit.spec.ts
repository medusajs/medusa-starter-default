import crypto from "node:crypto"

import { signOrderToken, verifyOrderToken } from "../order-token"

const SECRET = "unit-test-secret-order-token"

describe("order-token", () => {
  const originalSecret = process.env.JWT_SECRET

  beforeEach(() => {
    process.env.JWT_SECRET = SECRET
  })

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret
  })

  it("signs deterministically and verifies its own token", () => {
    const token = signOrderToken("order_123")

    expect(token).toEqual(signOrderToken("order_123"))
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(verifyOrderToken("order_123", token)).toBe(true)
  })

  it("keeps the wire format of links in already-sent mails", () => {
    // base64url(HMAC-SHA256(JWT_SECRET, "order-token:<id>")) — must never change
    const expected = crypto
      .createHmac("sha256", SECRET)
      .update("order-token:order_123")
      .digest("base64url")

    expect(signOrderToken("order_123")).toEqual(expected)
  })

  it("rejects a token for a different order id", () => {
    const token = signOrderToken("order_123")

    expect(verifyOrderToken("order_456", token)).toBe(false)
  })

  it("rejects a tampered token of the same length", () => {
    const token = signOrderToken("order_123")
    const last = token[token.length - 1]
    const tampered = token.slice(0, -1) + (last === "A" ? "B" : "A")

    expect(tampered).toHaveLength(token.length)
    expect(verifyOrderToken("order_123", tampered)).toBe(false)
  })

  it("rejects tokens with a different length without throwing", () => {
    const token = signOrderToken("order_123")

    expect(verifyOrderToken("order_123", token + "x")).toBe(false)
    expect(verifyOrderToken("order_123", token.slice(0, -1))).toBe(false)
    expect(verifyOrderToken("order_123", "x")).toBe(false)
  })

  it("rejects empty / non-string input", () => {
    const token = signOrderToken("order_123")

    expect(verifyOrderToken("", token)).toBe(false)
    expect(verifyOrderToken("order_123", "")).toBe(false)
    expect(verifyOrderToken("order_123", undefined as unknown as string)).toBe(false)
    expect(verifyOrderToken("order_123", 123 as unknown as string)).toBe(false)
  })

  it("invalidates tokens when JWT_SECRET is rotated", () => {
    const token = signOrderToken("order_123")
    process.env.JWT_SECRET = "another-secret"

    expect(verifyOrderToken("order_123", token)).toBe(false)
  })

  it("throws when JWT_SECRET is missing", () => {
    delete process.env.JWT_SECRET

    expect(() => signOrderToken("order_123")).toThrow("JWT_SECRET is not configured")
    expect(() => verifyOrderToken("order_123", "abc")).toThrow(
      "JWT_SECRET is not configured"
    )
  })
})
