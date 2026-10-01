import { config, endOfUtcDay } from "../fulfill-preorders"

describe("endOfUtcDay", () => {
  it.each([
    ["2026-03-05T00:00:00.000Z", "2026-03-05T23:59:59.999Z"],
    ["2026-03-05T13:37:00.000Z", "2026-03-05T23:59:59.999Z"],
    ["2026-03-05T23:59:59.999Z", "2026-03-05T23:59:59.999Z"],
    // Local offsets don't matter, only the UTC calendar day
    ["2026-03-05T01:00:00.000+02:00", "2026-03-04T23:59:59.999Z"],
    ["2026-03-05T22:00:00.000-05:00", "2026-03-06T23:59:59.999Z"],
    // Month / year / leap-day boundaries
    ["2028-02-29T10:00:00.000Z", "2028-02-29T23:59:59.999Z"],
    ["2026-12-31T23:00:00.000Z", "2026-12-31T23:59:59.999Z"],
  ])("%s -> %s", (input, expected) => {
    expect(endOfUtcDay(new Date(input)).toISOString()).toEqual(expected)
  })

  it("defaults to today (UTC)", () => {
    const today = new Date().toISOString().slice(0, 10)

    expect(endOfUtcDay().toISOString()).toEqual(`${today}T23:59:59.999Z`)
  })

  it("does not mutate the input date", () => {
    const input = new Date("2026-03-05T10:00:00.000Z")
    endOfUtcDay(input)

    expect(input.toISOString()).toEqual("2026-03-05T10:00:00.000Z")
  })
})

describe("fulfill-preorders job config", () => {
  it("runs daily at midnight", () => {
    expect(config).toEqual({ name: "daily-fulfill-preorders", schedule: "0 0 * * *" })
  })
})
