import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { subscribeToNewsletterWorkflow } from "../../../workflows/subscribe-to-newsletter"
import type { StoreSubscribeNewsletterBody } from "./validators"

/**
 * POST /store/newsletter
 * Open to guests. A first signup is 201 and a repeat is 200 with the same body.
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
