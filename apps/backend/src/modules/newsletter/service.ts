import { MedusaService } from "@medusajs/framework/utils"

import { NewsletterSubscriber } from "./models/subscriber"

/** Newsletter service. Only generated CRUD; the rules live in the subscribe
 * workflow. */
class NewsletterModuleService extends MedusaService({
  NewsletterSubscriber,
}) {}

export default NewsletterModuleService
