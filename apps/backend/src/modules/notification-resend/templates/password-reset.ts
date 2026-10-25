import { EmailContent, renderAction, renderLayout, renderParagraph } from "./layout"

export type PasswordResetData = {
  storeName?: string
  email?: string
  resetUrl: string
  /** Mirrors the token's lifetime in Medusa's core (15 minutes). */
  expiresInMinutes?: number
}

/** The reset link only, with its lifetime stated. */
export const passwordReset = (data: PasswordResetData): EmailContent => {
  const storeName = data.storeName ?? "DevCart"
  const minutes = data.expiresInMinutes ?? 15
  const action = renderAction(data.resetUrl, "Reset your password")

  const html = renderLayout({
    storeName,
    heading: "Reset your password",
    intro: `Someone asked to reset the password for ${
      data.email ? data.email : "your account"
    }. If that was you, choose a new one below.`,
    blocks: [
      action.html,
      renderParagraph(`The link works once and expires in ${minutes} minutes.`),
      renderParagraph(
        "If you did not ask for this, nothing has changed — ignore this email and your password stays as it is."
      ),
    ],
    footer: `Sent by ${storeName}. This link expires in ${minutes} minutes.`,
  })

  const text = [
    `${storeName} — reset your password`,
    "",
    data.email
      ? `Someone asked to reset the password for ${data.email}.`
      : "Someone asked to reset your password.",
    "",
    action.text,
    "",
    `The link works once and expires in ${minutes} minutes.`,
    "If you did not ask for this, nothing has changed — ignore this email.",
    "",
    `Sent by ${storeName}.`,
  ].join("\n")

  return { subject: `Reset your ${storeName} password`, html, text }
}
