import { model } from "@medusajs/framework/utils"

/**
 * One address on the homepage's mailing list.
 *
 * There is no customer link on purpose: most people who give an address here
 * have never ordered, and the list has to survive an address that never becomes
 * an account. The unique index is the rule "an address is on the list once",
 * which the subscribe workflow upserts against so a double submit cannot store
 * two rows.
 *
 * `email` holds the normalized (trimmed, lowercased) address — the workflow
 * writes it that way, so the index compares like with like.
 */
export const NewsletterSubscriber = model.define("newsletter_subscriber", {
  id: model.id().primaryKey(),
  email: model.text(),
}).indexes([
  {
    on: ["email"],
    unique: true,
  },
])
