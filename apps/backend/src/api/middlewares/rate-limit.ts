import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { SlidingWindow, takeToken } from "../../lib/rate-limit"

/**
 * Per-caller flood limit as middleware. Counts by IP unless the route supplies
 * a `key`, so a route behind `authenticate` can count by customer instead.
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
  /** Counter name, part of the stored key. */
  bucket: string
  /** Shown when the limit is reached. */
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

/** Key for routes that have already authenticated the caller. */
export const callerKey = (req: MaybeAuthenticatedRequest) =>
  req.auth_context?.actor_id ?? req.ip ?? "unknown"
