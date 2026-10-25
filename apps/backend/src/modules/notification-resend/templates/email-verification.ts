import {
  EmailContent,
  escapeHtml,
  renderLayout,
  renderParagraph,
} from "./layout"

export type EmailVerificationData = {
  storeName?: string
  code: string
  /** Matches the code lifetime in lib/email-verification.ts. */
  expiresInMinutes?: number
}

/** The six-digit code for a guest checkout. Nothing about the order or the
 * customer goes in this email. */
export const emailVerification = (
  data: EmailVerificationData
): EmailContent => {
  const storeName = data.storeName ?? "DevCart"
  const minutes = data.expiresInMinutes ?? 10
  // Rendered with spacing so it is read out and copied in one piece.
  const code = String(data.code ?? "")
  const grouped = code.split("").join(" ")

  const html = renderLayout({
    storeName,
    heading: "Your verification code",
    intro: "Enter this code on the checkout page to confirm your email address.",
    blocks: [
      `<div style="margin:8px 0 20px;padding:16px 20px;border:1px solid #212121;font:700 30px/1.2 'Courier New',Courier,monospace;letter-spacing:.24em;color:#212121;text-align:center;" data-testid="verification-code">${escapeHtml(
        code
      )}</div>`,
      renderParagraph(
        `The code works once and expires in ${minutes} minutes. If you close the checkout page, you can ask for a new one.`
      ),
      renderParagraph(
        "If you did not ask for this code, you can ignore this email. Your address is only used once the code is entered on the checkout page."
      ),
    ],
    footer: `Sent by ${storeName}. This code expires in ${minutes} minutes.`,
  })

  const text = [
    `${storeName} — your verification code`,
    "",
    "Enter this code on the checkout page to confirm your email address:",
    "",
    `    ${grouped}`,
    "",
    `The code works once and expires in ${minutes} minutes.`,
    "If you did not ask for this code, you can ignore this email.",
    "",
    `Sent by ${storeName}.`,
  ].join("\n")

  return { subject: `${code} is your ${storeName} verification code`, html, text }
}
