import { MedusaService } from "@medusajs/framework/utils"

import { EmailVerification } from "./models/email-verification"

/**
 * The email verification module's service. Only the generated CRUD is needed:
 * the rules (one live code, the send limits, the attempt limit, when a code
 * becomes a token) live in `workflows/request-email-verification-code.ts` and
 * `workflows/confirm-email-verification-code.ts`, so they are the same whether
 * a code is requested through the Store API or a script.
 */
class EmailVerificationModuleService extends MedusaService({
  EmailVerification,
}) {}

export default EmailVerificationModuleService
