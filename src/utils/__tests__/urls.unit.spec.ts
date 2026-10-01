import { signOrderToken } from "../order-token"
import {
  buildOrderUrl,
  buildPasswordResetUrl,
  buildVerifyUrl,
  getBackendUrl,
  getStorefrontUrl,
} from "../urls"

const ENV_KEYS = ["STOREFRONT_URL", "MEDUSA_BACKEND_URL", "NODE_ENV", "JWT_SECRET"] as const

describe("urls", () => {
  const saved: Record<string, string | undefined> = {}

  beforeAll(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key]
  })

  beforeEach(() => {
    process.env.NODE_ENV = "test"
    process.env.JWT_SECRET = "unit-test-secret-urls"
    process.env.STOREFRONT_URL = "https://shop.example.com"
    process.env.MEDUSA_BACKEND_URL = "https://api.example.com"
  })

  afterAll(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  describe("base urls", () => {
    it("strips trailing slashes and surrounding whitespace", () => {
      process.env.STOREFRONT_URL = "  https://shop.example.com///  "
      process.env.MEDUSA_BACKEND_URL = "https://api.example.com/"

      expect(getStorefrontUrl()).toEqual("https://shop.example.com")
      expect(getBackendUrl()).toEqual("https://api.example.com")
    })

    it("keeps a path prefix", () => {
      process.env.STOREFRONT_URL = "https://example.com/shop/"

      expect(getStorefrontUrl()).toEqual("https://example.com/shop")
    })

    it("falls back to localhost outside production", () => {
      delete process.env.STOREFRONT_URL
      process.env.MEDUSA_BACKEND_URL = "   "

      expect(getStorefrontUrl()).toEqual("http://localhost:4321")
      expect(getBackendUrl()).toEqual("http://localhost:9000")
    })

    it("throws in production when the variable is missing or blank", () => {
      process.env.NODE_ENV = "production"
      delete process.env.STOREFRONT_URL
      process.env.MEDUSA_BACKEND_URL = " "

      expect(() => getStorefrontUrl()).toThrow("STOREFRONT_URL is not set")
      expect(() => getBackendUrl()).toThrow("MEDUSA_BACKEND_URL is not set")
      expect(() => buildOrderUrl("order_1")).toThrow("STOREFRONT_URL is not set")
    })

    it("uses the configured value in production", () => {
      process.env.NODE_ENV = "production"
      process.env.STOREFRONT_URL = "https://shop.example.com/"

      expect(getStorefrontUrl()).toEqual("https://shop.example.com")
    })
  })

  describe("buildOrderUrl", () => {
    it("links to the order page with the guest token", () => {
      const url = new URL(buildOrderUrl("order_01ABC"))

      expect(url.origin + url.pathname).toEqual("https://shop.example.com/order/order_01ABC")
      expect(url.searchParams.get("t")).toEqual(signOrderToken("order_01ABC"))
    })

    it("encodes the order id", () => {
      expect(buildOrderUrl("a/b c")).toContain("/order/a%2Fb%20c?t=")
    })
  })

  describe("buildVerifyUrl", () => {
    it("carries customer id, email and token as query params", () => {
      const url = new URL(
        buildVerifyUrl({ customerId: "cus_1", email: "a+b@example.com", token: "p.s" })
      )

      expect(url.origin + url.pathname).toEqual("https://shop.example.com/verify-email")
      expect(url.searchParams.get("customer_id")).toEqual("cus_1")
      expect(url.searchParams.get("email")).toEqual("a+b@example.com")
      expect(url.searchParams.get("token")).toEqual("p.s")
      expect(url.searchParams.has("redirect")).toBe(false)
    })

    it("adds the redirect param when given", () => {
      const url = new URL(
        buildVerifyUrl({ customerId: "cus_1", email: "a@b.de", token: "t", redirect: "/checkout?step=2" })
      )

      expect(url.searchParams.get("redirect")).toEqual("/checkout?step=2")
    })
  })

  describe("buildPasswordResetUrl", () => {
    it("sends customers to the storefront without the email", () => {
      const url = buildPasswordResetUrl({ actorType: "customer", token: "a b", email: "c@d.de" })

      expect(url).toEqual("https://shop.example.com/reset-password?token=a%20b")
    })

    it("sends admin users to the dashboard with token and email", () => {
      const url = new URL(
        buildPasswordResetUrl({ actorType: "user", token: "tok", email: "admin@example.com" })
      )

      expect(url.origin + url.pathname).toEqual("https://api.example.com/app/reset-password")
      expect(url.searchParams.get("token")).toEqual("tok")
      expect(url.searchParams.get("email")).toEqual("admin@example.com")
    })
  })
})
