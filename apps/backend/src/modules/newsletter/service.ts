import { MedusaService } from "@medusajs/framework/utils"

import { NewsletterSubscriber } from "./models/subscriber"

/**
 * The newsletter module's service. The generated CRUD is all it needs; the one
 * rule the list has (an address is stored once, normalized) lives in
 * `workflows/subscribe-to-newsletter.ts`, so it holds for the Store API and for
 * a script that imports an old list alike.
 */
class NewsletterModuleService extends MedusaService({
  NewsletterSubscriber,
}) {}

export default NewsletterModuleService
