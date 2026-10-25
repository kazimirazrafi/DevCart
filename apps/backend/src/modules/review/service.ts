import { MedusaService } from "@medusajs/framework/utils"

import { Review } from "./models/review"

/** Review service. Only generated CRUD; the business rules live in the create
 * review workflow. */
class ReviewModuleService extends MedusaService({ Review }) {}

export default ReviewModuleService
