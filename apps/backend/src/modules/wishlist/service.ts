import { MedusaService } from "@medusajs/framework/utils"

import { WishlistItem } from "./models/wishlist-item"

/**
 * The wishlist module's service. The generated CRUD (`createWishlistItems`,
 * `listWishlistItems`, `deleteWishlistItems`, …) is all this module needs: the
 * rules that belong to a wishlist as a piece of business logic (the product
 * exists, a customer saves a product once, the link rows) live in
 * `workflows/add-wishlist-item.ts` and `workflows/remove-wishlist-item.ts`, so
 * they are the same whether a save arrives through the Store API or a script.
 */
class WishlistModuleService extends MedusaService({ WishlistItem }) {}

export default WishlistModuleService
