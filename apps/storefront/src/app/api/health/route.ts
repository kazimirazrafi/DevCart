import { getStoreName } from "@lib/util/env"

/*
 * A health check is a liveness question, not a page: it must never be cached,
 * and it must answer without rendering the layout, reading a region or touching
 * the catalogue.
 */
export const dynamic = "force-dynamic"

/**
 * GET /api/health
 *
 * The storefront's own liveness, for a uptime monitor or a keep-alive ping on a
 * host that suspends an idle service.
 *
 * It deliberately does not call the backend. That is what `/health/ready` on
 * the backend is for, and combining the two here would make the storefront
 * report itself down every time the backend cold-starts — the monitor would
 * then be measuring the wrong service and a slow morning would look like an
 * outage.
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
