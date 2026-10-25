import { EmailContent, renderAction, renderLayout, renderParagraph } from "./layout"

export type NewsletterWelcomeData = {
  storeName?: string
  email?: string
  catalogueUrl: string
  supportEmail?: string
}

/** The mailing-list signup email, with the way out included. */
export const newsletterWelcome = (data: NewsletterWelcomeData): EmailContent => {
  const storeName = data.storeName ?? "DevCart"
  const supportEmail = data.supportEmail ?? "support@kazimirazrafi.dev"
  const action = renderAction(data.catalogueUrl, "Browse the catalogue")

  const html = renderLayout({
    storeName,
    heading: "You're on the drop list",
    intro: data.email
      ? `${data.email} is on the list. We write twice a month: new arrivals, restocks and price cuts.`
      : "You are on the list. We write twice a month: new arrivals, restocks and price cuts.",
    blocks: [
      renderParagraph(
        "No cart reminders, no daily mail, and your address is never shared. If a month has nothing worth saying, that month is quiet."
      ),
      action.html,
      renderParagraph(
        `To leave the list at any time, reply to this email or write to ${supportEmail} and we will remove the address.`
      ),
    ],
    footer: `Sent by ${storeName} because this address joined the mailing list.`,
  })

  const text = [
    `${storeName} — you're on the drop list`,
    "",
    data.email
      ? `${data.email} is on the list.`
      : "You are on the list.",
    "We write twice a month: new arrivals, restocks and price cuts.",
    "No cart reminders, no daily mail, and your address is never shared.",
    "",
    action.text,
    "",
    `To leave the list, reply to this email or write to ${supportEmail}.`,
    "",
    `Sent by ${storeName}.`,
  ].join("\n")

  return { subject: `You're on the ${storeName} drop list`, html, text }
}
