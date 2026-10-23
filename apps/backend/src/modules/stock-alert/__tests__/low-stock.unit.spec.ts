import {
  availableUnits,
  DEFAULT_ALERT_COOLDOWN_HOURS,
  DEFAULT_LOW_STOCK_THRESHOLD,
  isAlertDue,
  lowStockLevels,
  readCooldownHours,
  readThreshold,
} from "../low-stock"

describe("low-stock rules", () => {
  describe("availableUnits", () => {
    it("counts what is left after the reserved units", () => {
      expect(availableUnits({ stocked_quantity: 10, reserved_quantity: 4 })).toBe(6)
    })

    it("reports an oversold level as zero rather than a negative", () => {
      expect(availableUnits({ stocked_quantity: 2, reserved_quantity: 5 })).toBe(0)
    })

    it("treats missing numbers as none", () => {
      expect(availableUnits({})).toBe(0)
      expect(availableUnits({ stocked_quantity: null, reserved_quantity: null })).toBe(0)
    })
  })

  describe("readThreshold", () => {
    it("uses the configured number", () => {
      expect(readThreshold("12")).toBe(12)
      expect(readThreshold("0")).toBe(0)
    })

    it("falls back when unset or nonsense", () => {
      expect(readThreshold(undefined)).toBe(DEFAULT_LOW_STOCK_THRESHOLD)
      expect(readThreshold("five")).toBe(DEFAULT_LOW_STOCK_THRESHOLD)
      expect(readThreshold("-3")).toBe(DEFAULT_LOW_STOCK_THRESHOLD)
    })
  })

  describe("readCooldownHours", () => {
    it("uses the configured number", () => {
      expect(readCooldownHours("2")).toBe(2)
    })

    it("falls back when unset or nonsense", () => {
      expect(readCooldownHours(undefined)).toBe(DEFAULT_ALERT_COOLDOWN_HOURS)
      expect(readCooldownHours("soon")).toBe(DEFAULT_ALERT_COOLDOWN_HOURS)
    })
  })

  describe("lowStockLevels", () => {
    it("keeps the levels at or below the threshold and drops the rest", () => {
      const lines = lowStockLevels(
        {
          id: "iitem_1",
          sku: "SKU-1",
          title: "Black / M",
          location_levels: [
            { location_id: "loc_1", stocked_quantity: 20, reserved_quantity: 0 },
            { location_id: "loc_2", stocked_quantity: 5, reserved_quantity: 0 },
            { location_id: "loc_3", stocked_quantity: 6, reserved_quantity: 2 },
          ],
        },
        5
      )

      expect(lines).toHaveLength(2)
      expect(lines.map((line) => line.location_id)).toEqual(["loc_2", "loc_3"])
      expect(lines[1].available).toBe(4)
      expect(lines[0].sku).toBe("SKU-1")
    })

    it("keeps a level exactly at the threshold", () => {
      const lines = lowStockLevels(
        {
          id: "iitem_2",
          location_levels: [{ location_id: "loc_1", stocked_quantity: 5 }],
        },
        5
      )

      expect(lines).toHaveLength(1)
      expect(lines[0].available).toBe(5)
    })

    it("skips a level with no location", () => {
      const lines = lowStockLevels(
        {
          id: "iitem_3",
          location_levels: [{ location_id: null, stocked_quantity: 1 }],
        },
        5
      )

      expect(lines).toHaveLength(0)
    })

    it("says nothing about an item with no levels", () => {
      expect(lowStockLevels({ id: "iitem_4" }, 5)).toHaveLength(0)
    })
  })

  describe("isAlertDue", () => {
    const now = new Date("2026-10-20T12:00:00.000Z")

    it("is due when the level has never been reported", () => {
      expect(isAlertDue(null, now, 24)).toBe(true)
      expect(isAlertDue(undefined, now, 24)).toBe(true)
    })

    it("is not due inside the cooldown", () => {
      expect(isAlertDue(new Date("2026-10-20T00:00:00.000Z"), now, 24)).toBe(false)
    })

    it("is due once the cooldown has passed", () => {
      expect(isAlertDue(new Date("2026-10-19T11:59:00.000Z"), now, 24)).toBe(true)
    })

    it("reads a stored timestamp the same way as a Date", () => {
      expect(isAlertDue("2026-10-19T11:59:00.000Z", now, 24)).toBe(true)
    })

    it("is due when the stored value cannot be read", () => {
      expect(isAlertDue("not a date", now, 24)).toBe(true)
    })
  })
})
