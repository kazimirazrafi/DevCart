import { model } from "@medusajs/framework/utils"

/** One address on the mailing list. Not linked to a customer: most
 * subscribers never order. The unique index keeps an address on the list once. */
export const NewsletterSubscriber = model.define("newsletter_subscriber", {
  id: model.id().primaryKey(),
  email: model.text(),
}).indexes([
  {
    on: ["email"],
    unique: true,
  },
])
