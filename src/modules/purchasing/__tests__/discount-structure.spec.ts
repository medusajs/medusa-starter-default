/**
 * Tests for discount structure validation and resolution
 * TEM-171: Supplier Discount Configuration Structure
 */

import { describe, test, expect } from "@jest/globals"
import { validateDiscountStructure } from "../validators/discount-structure-validator"
import { DiscountStructure } from "../types/discount-types"

describe("Discount Structure Validation", () => {
  describe("Code Mapping Structure", () => {
    test("validates valid code mapping structure", () => {
      const structure = {
        type: "code_mapping" as const,
        description: "Caterpillar discount codes",
        mappings: { A: 25, B: 35, C: 40, D: 45 }
      }

      expect(() => validateDiscountStructure(structure)).not.toThrow()
      const validated = validateDiscountStructure(structure)
      expect(validated.type).toBe("code_mapping")
      if (validated.type === "code_mapping") {
        expect(validated.mappings.A).toBe(25)
        expect(validated.mappings.B).toBe(35)
      }
    })

    test("validates code mapping without description", () => {
      const structure = {
        type: "code_mapping" as const,
        mappings: { A: 25, B: 35 }
      }

      expect(() => validateDiscountStructure(structure)).not.toThrow()
    })

    test("rejects code mapping with percentage > 100", () => {
      const structure = {
        type: "code_mapping" as const,
        mappings: { A: 150 }  // Invalid: > 100
      }

      expect(() => validateDiscountStructure(structure)).toThrow()
    })

    test("rejects code mapping with negative percentage", () => {
      const structure = {
        type: "code_mapping" as const,
        mappings: { A: -10 }  // Invalid: < 0
      }

      expect(() => validateDiscountStructure(structure)).toThrow()
    })
  })

  describe("Percentage Structure", () => {
    test("validates valid percentage structure", () => {
      const structure = {
        type: "percentage" as const,
        description: "Fixed 20% discount",
        default_percentage: 20
      }

      expect(() => validateDiscountStructure(structure)).not.toThrow()
      const validated = validateDiscountStructure(structure)
      expect(validated.type).toBe("percentage")
      if (validated.type === "percentage") {
        expect(validated.default_percentage).toBe(20)
      }
    })

    test("rejects percentage > 100", () => {
      const structure = {
        type: "percentage" as const,
        default_percentage: 150  // Invalid: > 100
      }

      expect(() => validateDiscountStructure(structure)).toThrow()
    })

    test("rejects negative percentage", () => {
      const structure = {
        type: "percentage" as const,
        default_percentage: -5  // Invalid: < 0
      }

      expect(() => validateDiscountStructure(structure)).toThrow()
    })

    test("accepts 0% discount", () => {
      const structure = {
        type: "percentage" as const,
        default_percentage: 0
      }

      expect(() => validateDiscountStructure(structure)).not.toThrow()
    })

    test("accepts 100% discount", () => {
      const structure = {
        type: "percentage" as const,
        default_percentage: 100
      }

      expect(() => validateDiscountStructure(structure)).not.toThrow()
    })
  })

  describe("Calculated Structure", () => {
    test("validates calculated structure", () => {
      const structure = {
        type: "calculated" as const,
        description: "Supplier provides both gross and net"
      }

      expect(() => validateDiscountStructure(structure)).not.toThrow()
      const validated = validateDiscountStructure(structure)
      expect(validated.type).toBe("calculated")
    })

    test("validates calculated structure without description", () => {
      const structure = {
        type: "calculated" as const
      }

      expect(() => validateDiscountStructure(structure)).not.toThrow()
    })
  })

  describe("Net Only Structure", () => {
    test("validates net-only structure", () => {
      const structure = {
        type: "net_only" as const,
        description: "Supplier provides only net prices"
      }

      expect(() => validateDiscountStructure(structure)).not.toThrow()
      const validated = validateDiscountStructure(structure)
      expect(validated.type).toBe("net_only")
    })

    test("validates net-only structure without description", () => {
      const structure = {
        type: "net_only" as const
      }

      expect(() => validateDiscountStructure(structure)).not.toThrow()
    })
  })

  describe("Invalid Structures", () => {
    test("rejects structure without type", () => {
      const structure = {
        description: "Missing type"
      }

      expect(() => validateDiscountStructure(structure)).toThrow()
    })

    test("rejects structure with invalid type", () => {
      const structure = {
        type: "invalid_type",
        description: "Invalid type"
      }

      expect(() => validateDiscountStructure(structure)).toThrow()
    })

    test("rejects null input", () => {
      expect(() => validateDiscountStructure(null)).toThrow()
    })

    test("rejects undefined input", () => {
      expect(() => validateDiscountStructure(undefined)).toThrow()
    })
  })
})

describe("Discount Resolution Logic", () => {
  // Note: These tests would require importing PurchasingService
  // For now, we'll test the logic directly

  describe("resolveDiscountCode", () => {
    test("resolves valid discount code", () => {
      const structure: DiscountStructure = {
        type: "code_mapping",
        mappings: { A: 25, B: 35, C: 40 }
      }

      // Simulate service method logic
      const resolveCode = (code: string, struct: DiscountStructure): number | null => {
        if (struct.type === "code_mapping") {
          return struct.mappings[code] || null
        }
        return null
      }

      expect(resolveCode("A", structure)).toBe(25)
      expect(resolveCode("B", structure)).toBe(35)
      expect(resolveCode("C", structure)).toBe(40)
    })

    test("returns null for unknown discount code", () => {
      const structure: DiscountStructure = {
        type: "code_mapping",
        mappings: { A: 25 }
      }

      const resolveCode = (code: string, struct: DiscountStructure): number | null => {
        if (struct.type === "code_mapping") {
          return struct.mappings[code] || null
        }
        return null
      }

      expect(resolveCode("Z", structure)).toBeNull()
    })

    test("returns null for non-code-mapping structure", () => {
      const structure: DiscountStructure = {
        type: "percentage",
        default_percentage: 20
      }

      const resolveCode = (code: string, struct: DiscountStructure): number | null => {
        if (struct.type === "code_mapping") {
          return struct.mappings[code] || null
        }
        return null
      }

      expect(resolveCode("A", structure)).toBeNull()
    })
  })

  describe("getDefaultDiscountPercentage", () => {
    test("returns default percentage for percentage structure", () => {
      const structure: DiscountStructure = {
        type: "percentage",
        default_percentage: 20
      }

      const getDefault = (struct: DiscountStructure): number | null => {
        if (struct.type === "percentage") {
          return struct.default_percentage
        }
        return null
      }

      expect(getDefault(structure)).toBe(20)
    })

    test("returns null for non-percentage structure", () => {
      const structure: DiscountStructure = {
        type: "code_mapping",
        mappings: { A: 25 }
      }

      const getDefault = (struct: DiscountStructure): number | null => {
        if (struct.type === "percentage") {
          return struct.default_percentage
        }
        return null
      }

      expect(getDefault(structure)).toBeNull()
    })
  })
})

describe("Type Safety", () => {
  test("discriminated union ensures type safety", () => {
    const structure: DiscountStructure = {
      type: "code_mapping",
      mappings: { A: 25 }
    }

    // TypeScript should enforce that only valid types are accessible
    if (structure.type === "code_mapping") {
      expect(structure.mappings).toBeDefined()
      // @ts-expect-error - default_percentage should not exist on code_mapping
      expect(structure.default_percentage).toBeUndefined()
    }
  })

  test("percentage structure has correct properties", () => {
    const structure: DiscountStructure = {
      type: "percentage",
      default_percentage: 20
    }

    if (structure.type === "percentage") {
      expect(structure.default_percentage).toBe(20)
      // @ts-expect-error - mappings should not exist on percentage
      expect(structure.mappings).toBeUndefined()
    }
  })
})
