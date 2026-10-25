import { EmailContent, renderAction, renderLayout, renderParagraph } from "./layout"

export type OrderTransferRequestedData = {
  storeName?: string
  /** The human-facing order number (Medusa's display_id). */
  orderNumber?: string | number
  /** The order id, so it can be quoted without digging it out of a URL. */
  orderId?: string
  /** Where the order is going: the signed-in customer who asked for it. */
  recipientEmail?: string
  /** Who placed it, when that is a different address. */
  originalEmail?: string
  acceptUrl: string
  declineUrl?: string
}

/**
 * The other half of an order transfer: without this mail an accepted request
 * looks like it vanished, because the order only changes hands when the link
 * is opened. In core Medusa the request only emits an event, so the storefront
 * never hears about it unless a subscriber sends this.
 */
export const orderTransferRequested = (
  data: OrderTransferRequestedData
): EmailContent => {
  const storeName = data.storeName ?? "DevCart"
  const orderNumber = String(data.orderNumber ?? "")
  const action = renderAction(data.acceptUrl, "Move this order to my account")
  const decline = data.declineUrl
    ? renderParagraph(
        `If this is not yours, leave it where it is: <a href="${data.declineUrl}" style="color:#212121;">decline the transfer</a>.`
      )
    : ""

  const from = data.originalEmail
    ? ` It was placed with ${data.originalEmail}.`
    : ""

  const html = renderLayout({
    storeName,
    heading: `Order #${orderNumber} is being moved to you`,
    intro: `${data.recipientEmail ? data.recipientEmail : "You"} has asked for order #${orderNumber} to belong to this account.${from} Accept and it appears in your order history.`,
    blocks: [
      action.html,
      renderParagraph("The link only works once."),
      decline,
    ].filter((block) => block !== ""),
    footer: `Sent by ${storeName}. If you did not ask for this, ignore this email and nothing changes.`,
  })

  const text = [
    `${storeName} — order #${orderNumber} is being moved to you`,
    "",
    `${data.recipientEmail ?? "You"} has asked for order #${orderNumber} to belong to this account.${from}`,
    "",
    action.text,
    "",
    "The link only works once.",
    data.declineUrl ? `Decline the transfer: ${data.declineUrl}` : "",
    "",
    `Sent by ${storeName}.`,
  ]
    .filter((line) => line !== "")
    .join("\n")

  return { subject: `Order #${orderNumber} is being moved to your account`, html, text }
}
