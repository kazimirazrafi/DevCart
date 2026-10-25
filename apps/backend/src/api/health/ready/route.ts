import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /health/ready
 * Unlike Medusa's own /health, this asks the database, so a suspended free-tier
 * database is woken by the ping and a dead one answers 503. Public because a
 * monitor cannot hold a session.
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

    // The reason is logged, not returned: this endpoint is unauthenticated.
    return res.status(503).json({
      status: "unavailable",
      database: "down",
      time: new Date().toISOString(),
    })
  }
}
