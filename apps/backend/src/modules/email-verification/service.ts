import { MedusaService } from "@medusajs/framework/utils"

import { EmailVerification } from "./models/email-verification"

/** Email verification service. Only generated CRUD; the code rules live in
 * the request and confirm workflows. */
class EmailVerificationModuleService extends MedusaService({
  EmailVerification,
}) {}

export default EmailVerificationModuleService
