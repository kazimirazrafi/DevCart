import { HttpTypes } from "@medusajs/types"

/**
 * How many units of a variant a single line may hold: the inventory the product
 * API reports when the variant is tracked and cannot be back-ordered, or `null`
 * when stock is not a limit at all.
 *
 * The cart response carries no inventory (checked against the Store API: the
 * line item's variant has `manage_inventory` but no `inventory_quantity`), so
 * every caller reads this from a product variant instead.
 */
export const remainingUnits = (
  variant: Pick<
    HttpTypes.StoreProductVariant,
    "manage_inventory" | "allow_backorder" | "inventory_quantity"
  >
): number | null => {
  if (!variant.manage_inventory || variant.allow_backorder) {
    return null
  }

  return Math.max(variant.inventory_quantity ?? 0, 0)
}
