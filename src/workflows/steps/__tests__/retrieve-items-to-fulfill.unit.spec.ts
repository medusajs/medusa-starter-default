import { MedusaError } from "@medusajs/framework/utils"

import {
  planPreorderFulfillment,
  type RetrieveItemsToFulfillStepInput,
} from "../retrieve-items-to-fulfill"

type Order = RetrieveItemsToFulfillStepInput["order"]

const preorder = (status = "pending"): RetrieveItemsToFulfillStepInput["preorder"] => ({
  id: "pre_1",
  status,
  item: { id: "prevar_1", variant_id: "variant_pre" },
})

const order = (items: Order["items"], status = "pending"): Order => ({
  id: "order_1",
  status,
  items,
})

describe("planPreorderFulfillment", () => {
  it.each(["fulfilled", "cancelled"])("skips preorders that are already %s", (status) => {
    const plan = planPreorderFulfillment({
      preorder: preorder(status),
      order: order([{ id: "item_1", variant_id: "variant_pre", quantity: 1 }]),
    })

    expect(plan).toEqual({ action: "skip", items_to_fulfill: [] })
  })

  it("cancels the preorder when the order is canceled", () => {
    const plan = planPreorderFulfillment({
      preorder: preorder(),
      order: order([{ id: "item_1", variant_id: "variant_pre", quantity: 1 }], "canceled"),
    })

    expect(plan).toEqual({ action: "cancel", items_to_fulfill: [] })
  })

  it("fulfills the full quantity of the matching item only", () => {
    const plan = planPreorderFulfillment({
      preorder: preorder(),
      order: order([
        { id: "item_normal", variant_id: "variant_normal", quantity: 3 },
        { id: "item_pre", variant_id: "variant_pre", quantity: 2 },
        null,
        { id: "item_novariant", variant_id: null, quantity: 1 },
      ]),
    })

    expect(plan).toEqual({
      action: "fulfill",
      items_to_fulfill: [{ id: "item_pre", quantity: 2 }],
    })
  })

  it("uses detail quantities (order edits) and subtracts already fulfilled units", () => {
    const plan = planPreorderFulfillment({
      preorder: preorder(),
      order: order([
        {
          id: "item_a",
          variant_id: "variant_pre",
          quantity: 5,
          detail: { quantity: 4, fulfilled_quantity: 1 },
        },
        {
          id: "item_b",
          variant_id: "variant_pre",
          quantity: 2,
          detail: { quantity: 2, fulfilled_quantity: 2 },
        },
      ]),
    })

    expect(plan).toEqual({
      action: "fulfill",
      items_to_fulfill: [{ id: "item_a", quantity: 3 }],
    })
  })

  it("marks the preorder fulfilled when everything was already fulfilled", () => {
    const plan = planPreorderFulfillment({
      preorder: preorder(),
      order: order([
        {
          id: "item_a",
          variant_id: "variant_pre",
          quantity: 2,
          detail: { quantity: 2, fulfilled_quantity: 2 },
        },
      ]),
    })

    expect(plan).toEqual({ action: "mark_fulfilled", items_to_fulfill: [] })
  })

  it("cancels the preorder when the item was edited down to zero", () => {
    const plan = planPreorderFulfillment({
      preorder: preorder(),
      order: order([
        {
          id: "item_a",
          variant_id: "variant_pre",
          quantity: 1,
          detail: { quantity: 0, fulfilled_quantity: 0 },
        },
      ]),
    })

    expect(plan).toEqual({ action: "cancel", items_to_fulfill: [] })
  })

  it("throws NOT_FOUND (and leaves the preorder pending) when no item matches", () => {
    const run = () =>
      planPreorderFulfillment({
        preorder: preorder(),
        order: order([{ id: "item_1", variant_id: "variant_other", quantity: 1 }]),
      })

    expect(run).toThrow(MedusaError)
    expect(run).toThrow(/has no item for variant variant_pre/)
    try {
      run()
    } catch (e) {
      expect((e as MedusaError).type).toEqual(MedusaError.Types.NOT_FOUND)
    }
  })

  it("throws when the order has no items at all", () => {
    expect(() =>
      planPreorderFulfillment({ preorder: preorder(), order: order(null) })
    ).toThrow(MedusaError)
  })
})
