import { MedusaService } from "@medusajs/framework/utils"

import { WishlistItem } from "./models/wishlist-item"

/** Wishlist service. Only generated CRUD; the rules live in the add and
 * remove workflows. */
class WishlistModuleService extends MedusaService({ WishlistItem }) {}

export default WishlistModuleService
