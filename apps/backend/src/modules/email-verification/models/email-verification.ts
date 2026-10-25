import { model } from "@medusajs/framework/utils"

/**
 * One address being proved. The address is the unique key: a new code replaces
 * the stored hash. code_hash is an HMAC, since a plain hash of six digits is
 * reversible. The attempt and send counters live on the row so they survive a
 * restart. There is no verified column; a confirmation returns a signed token.
 */
export const EmailVerification = model.define("email_verification", {
  id: model.id().primaryKey(),
  /** Normalised (trimmed, lowercased) before it is written. */
  email: model.text(),
  code_hash: model.text().nullable(),
  expires_at: model.dateTime().nullable(),
  attempts: model.number().default(0),
  last_sent_at: model.dateTime().nullable(),
  window_started_at: model.dateTime().nullable(),
  window_sent_count: model.number().default(0),
}).indexes([
  {
    on: ["email"],
    unique: true,
  },
])
