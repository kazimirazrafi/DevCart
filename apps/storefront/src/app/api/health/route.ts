import { getStoreName } from "@lib/util/env"

/* Never cached, and it answers without rendering the layout or reading the catalogue. */
export const dynamic = "force-dynamic"

/**
 * GET /api/health: the storefront's own liveness, for a monitor or a keep-alive
 * ping. It does not call the backend; that is what /health/ready is for, and
 * combining them would report the storefront down on every backend cold start.
 */
export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "storefront",
      store: getStoreName(),
      time: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  )
}
