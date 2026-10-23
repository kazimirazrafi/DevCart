import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { SlidingWindow, takeToken } from "../../lib/rate-limit"

/**
 * A per-caller flood limit for a route, as middleware so the route handler
 * keeps its own shape and a route added later cannot forget it.
 *
 * The identity defaults to the caller's IP — the only thing known before a
 * body is read — and a route that has already authenticated the caller passes
 * `key` to count by customer id instead, so one busy customer behind a shared
 * address does not spend another's allowance.
 *
 * The refusal is the same JSON shape the email-verification route answers with,
 * so the storefront has one `too_many_requests` code to read and one
 * `Retry-After` header to obey.
 */
/**
 * What a middleware that runs after `authenticate` has on the request. The
 * framework widens the request type back to `MedusaRequest` for a middleware
 * list, so the one field this needs is named rather than assumed.
 */
export type MaybeAuthenticatedRequest = MedusaRequest & {
  auth_context?: { actor_id?: string | null }
}

export const rateLimit = ({
  bucket,
  limit,
  windowMs,
  message,
  key,
}: SlidingWindow & {
  /** The name this counter is known by; it is part of the stored key. */
  bucket: string
  /** What the customer is told when the limit is reached. */
  message: string
  key?: (req: MaybeAuthenticatedRequest) => string | undefined
}) => {
  return async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    const identity =
      key?.(req as MaybeAuthenticatedRequest) || req.ip || "unknown"
    const result = await takeToken(`${bucket}:${identity}`, { limit, windowMs })

    if (result.allowed) {
      return next()
    }

    res.setHeader("Retry-After", String(result.retry_after_seconds))

    return res.status(429).json({
      error: {
        code: "too_many_requests",
        message,
        retry_after_seconds: result.retry_after_seconds,
      },
    })
  }
}

/** The half of the route definition every limited route repeats. */
export const callerKey = (req: MaybeAuthenticatedRequest) =>
  req.auth_context?.actor_id ?? req.ip ?? "unknown"
