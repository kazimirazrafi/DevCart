import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /health/ready
 *
 * Readiness, as opposed to Medusa's own `/health`. That one answers for the
 * process — it is what a load balancer uses to know the server is up — and it
 * keeps answering when the database is gone, which is exactly the difference a
 * keep-alive ping and an uptime monitor need to see.
 *
 * This one asks the database a question, so:
 *
 * - a failed answer is a `503` rather than a misleading `200`;
 * - a free-tier database that suspends after inactivity is woken by the ping
 *   instead of by the next customer, which is what a keep-alive is for.
 *
 * It is public and unauthenticated on purpose: a monitor cannot hold a session.
 * It costs one round trip and nothing else, and it sends no credentials or
 * catalogue data back.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const startedAt = Date.now()

  res.setHeader("Cache-Control", "no-store")

  try {
    const db = req.scope.resolve<{ raw: (sql: string) => Promise<unknown> }>(
      ContainerRegistrationKeys.PG_CONNECTION
    )

    await db.raw("select 1")

    return res.status(200).json({
      status: "ok",
      database: "up",
      latency_ms: Date.now() - startedAt,
      time: new Date().toISOString(),
    })
  } catch (error) {
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
    const reason = error instanceof Error ? error.message : String(error)

    logger.error(`Health check failed: ${reason}`)

    /*
     * No reason in the body: an unauthenticated caller does not need to learn
     * the database's hostname or driver error, and the log has it.
     */
    return res.status(503).json({
      status: "unavailable",
      database: "down",
      time: new Date().toISOString(),
    })
  }
}
