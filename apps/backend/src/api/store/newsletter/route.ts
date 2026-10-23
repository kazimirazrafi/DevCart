import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { subscribeToNewsletterWorkflow } from "../../../workflows/subscribe-to-newsletter"
import type { StoreSubscribeNewsletterBody } from "./validators"

/**
 * POST /store/newsletter
 *
 * Adds an address to the mailing list. No authentication: the form is on the
 * homepage, where most visitors are not signed in, and the only thing it stores
 * is the address they typed.
 *
 * A first signup is `201` and a repeat is `200` with the same body — the visitor
 * is on the list after either one, and being told off for subscribing twice
 * helps nobody. The address is validated and lowercased before it reaches the
 * workflow, so `Name@Example.com` and `name@example.com` are one subscriber.
 */
export async function POST(
  req: MedusaRequest<StoreSubscribeNewsletterBody>,
  res: MedusaResponse
) {
  const { result } = await subscribeToNewsletterWorkflow(req.scope).run({
    input: { email: req.validatedBody.email },
  })

  res.status(result.created ? 201 : 200).json({
    subscribed: true,
    created: result.created,
  })
}
