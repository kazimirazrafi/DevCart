import { Module } from "@medusajs/framework/utils"

import EmailVerificationModuleService from "./service"

export const EMAIL_VERIFICATION_MODULE = "email_verification"

export default Module(EMAIL_VERIFICATION_MODULE, {
  service: EmailVerificationModuleService,
})
