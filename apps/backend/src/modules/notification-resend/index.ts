import { ModuleProvider, Modules } from "@medusajs/framework/utils"

import { ResendNotificationService } from "./services/resend"

/*
 * A provider module, not a standalone module: it plugs into the notification
 * module (`medusa-config.ts`) and answers for the `email` channel. The templates
 * next to it are the store's own, so the copy is reviewed with the code instead
 * of in a third-party dashboard.
 */
export default ModuleProvider(Modules.NOTIFICATION, {
  services: [ResendNotificationService],
})
