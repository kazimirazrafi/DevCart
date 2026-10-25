import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import { ResendNotificationService } from "./services/resend"

/* A notification provider for the email channel, plugged in through
 * medusa-config.ts. Templates live next to it. */
export default ModuleProvider(Modules.NOTIFICATION, {
  services: [ResendNotificationService],
})
