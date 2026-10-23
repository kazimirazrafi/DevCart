import { listWishlist } from "@lib/data/wishlist"

/**
 * GET /api/wishlist
 *
 * The ids the hearts on a page need to know which products are already saved.
 *
 * This exists as a route handler rather than a read in a layout because the
 * storefront's catalogue pages are prerendered: calling `cookies()` in the
 * layout would make every page dynamic for the sake of a heart. The hearts
 * fetch this once per page load through the client-side store in
 * `lib/util/wishlist-store.ts`, so a listing of twelve plates costs one request
 * rather than twelve.
 *
 * Signed out, the answer is an empty list rather than an error: an anonymous
 * visitor has no saves, and the button's own action is what asks them to sign
 * in.
 */
export async function GET() {
  const items = await listWishlist()

  return Response.json(
    {
      items: items.map(({ id, product_id }) => ({ id, product_id })),
    },
    { headers: { "cache-control": "no-store" } }
  )
}
