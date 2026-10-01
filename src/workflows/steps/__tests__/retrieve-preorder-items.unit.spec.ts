import { isActivePreorderVariant } from "../retrieve-preorder-items"

const NOW = new Date("2026-06-15T12:00:00.000Z")

describe("isActivePreorderVariant", () => {
  it.each([null, undefined])("is false for %s", (value) => {
    expect(isActivePreorderVariant(value, NOW)).toBe(false)
  })

  it("is true for an enabled config with a future date", () => {
    expect(
      isActivePreorderVariant(
        { id: "pv_1", status: "enabled", available_date: new Date("2026-06-16T00:00:00Z") },
        NOW
      )
    ).toBe(true)
  })

  it("accepts ISO strings (as returned by Query / HTTP)", () => {
    expect(
      isActivePreorderVariant(
        { id: "pv_1", status: "enabled", available_date: "2026-06-15T12:00:00.001Z" },
        NOW
      )
    ).toBe(true)
  })

  it("is false for a disabled config even with a future date", () => {
    expect(
      isActivePreorderVariant(
        { id: "pv_1", status: "disabled", available_date: "2027-01-01T00:00:00Z" },
        NOW
      )
    ).toBe(false)
  })

  it("is false once the available date is reached or passed", () => {
    expect(
      isActivePreorderVariant(
        { id: "pv_1", status: "enabled", available_date: NOW.toISOString() },
        NOW
      )
    ).toBe(false)
    expect(
      isActivePreorderVariant(
        { id: "pv_1", status: "enabled", available_date: "2026-01-01T00:00:00Z" },
        NOW
      )
    ).toBe(false)
  })

  it("is false for an unparsable date", () => {
    expect(
      isActivePreorderVariant(
        { id: "pv_1", status: "enabled", available_date: "not-a-date" },
        NOW
      )
    ).toBe(false)
  })

  it("defaults `now` to the current time", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000)
    const past = new Date(Date.now() - 60 * 60 * 1000)

    expect(isActivePreorderVariant({ id: "pv", status: "enabled", available_date: future })).toBe(true)
    expect(isActivePreorderVariant({ id: "pv", status: "enabled", available_date: past })).toBe(false)
  })
})
