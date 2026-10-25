import { HttpTypes } from "@medusajs/types"

/**
 * Units a line may hold: the reported inventory when the variant is tracked and
 * cannot be back-ordered, otherwise null. Callers pass a product variant, since
 * cart lines carry no inventory_quantity.
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
