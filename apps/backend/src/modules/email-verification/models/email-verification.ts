import { model } from "@medusajs/framework/utils"

/**
 * One address being proved, and the state of that proof.
 *
 * A guest may only have one live code at a time, so the address is the unique
 * key. Asking for another code replaces the hash rather than adding a row,
 * which is what makes "the last code we mailed" unambiguous and keeps the
 * table from growing with every resend.
 *
 * `code_hash` is an HMAC of the code, never the code itself: a six-digit code
 * has a million possibilities, so a plain hash in a leaked database would be
 * reversed immediately. `attempts` is what burns the code after a handful of
 * wrong guesses; `last_sent_at`, `window_started_at` and `window_sent_count`
 * are the send limits, kept here so they survive a restart rather than living
 * in one process's memory.
 *
 * There is deliberately no "verified" column. A confirmation returns a signed
 * token instead, and the token is what the cart's completion reads; nothing has
 * to be cleaned up and an old token cannot be revived by an update.
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
