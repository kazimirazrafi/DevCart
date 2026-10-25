import { listWishlist } from "@lib/data/wishlist"

/**
 * GET /api/wishlist: the saved product ids behind the hearts. A route handler
 * rather than a layout read, because cookies() there would make every prerendered
 * catalogue page dynamic. Signed out, the answer is an empty list.
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
