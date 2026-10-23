import {
  EmailContent,
  escapeHtml,
  formatDate,
  renderAction,
  renderLayout,
  renderParagraph,
  renderRows,
} from "./layout"

export type ShipmentData = {
  storeName?: string
  orderNumber: string | number
  shippedAt?: string | null
  customerName?: string
  orderUrl: string
  /** What left the warehouse in this parcel, with the quantity shipped. */
  items?: { title?: string; quantity?: number }[]
  tracking?: { number?: string | null; url?: string | null }[]
  shippingAddress?: string[]
  shippingMethod?: string | null
}

/**
 * The shipment is the second half of the order story: the confirmation said
 * what was bought, this says what has left and how to follow it. It carries no
 * prices on purpose — the money was settled in the confirmation, and repeating
 * it invites the two emails to disagree after a refund.
 */
export const shipment = (data: ShipmentData): EmailContent => {
  const storeName = data.storeName ?? "DevCart"
  const orderNumber = String(data.orderNumber ?? "")
  const shippedOn = formatDate(data.shippedAt)

  const items = (data.items ?? [])
    .map((item) => ({
      title: String(item.title ?? "Item"),
      quantity: Number(item.quantity ?? 1),
    }))
    .filter((item) => item.title)

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;font:400 14px/1.5 Arial,Helvetica,sans-serif;color:#212121;">
          ${escapeHtml(item.title)} <span style="color:#5b5b5b;">× ${item.quantity}</span>
        </td>
      </tr>
    `
    )
    .join("")

  const itemTable = items.length
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #d6d3c9;margin:0 0 8px;">
        ${itemRows}
      </table>
    `
    : ""

  /*
   * A fulfillment can carry more than one label (split parcels, a reprint), so
   * every number is printed rather than assuming the first is the parcel.
   */
  const tracking = (data.tracking ?? []).filter(
    (entry) => entry.number || entry.url
  )

  const trackingRows = tracking.length
    ? renderRows(
        tracking.map((entry, index) => ({
          label:
            tracking.length > 1 ? `Tracking number ${index + 1}` : "Tracking number",
          value: entry.number || "See the carrier's page",
        }))
      )
    : ""

  const trackingActions = tracking
    .map((entry, index) =>
      entry.url
        ? renderAction(
            entry.url,
            tracking.length > 1 ? `Track parcel ${index + 1}` : "Track your parcel"
          ).html
        : ""
    )
    .join("")

  const address = (data.shippingAddress ?? []).filter(Boolean)

  const addressBlock = address.length
    ? `
      <h2 style="margin:24px 0 6px;font:700 15px/1.4 Georgia,'Times New Roman',serif;color:#212121;">Shipping to</h2>
      <div style="font:14px/1.6 Arial,Helvetica,sans-serif;color:#212121;">
        ${address.map((line) => escapeHtml(line)).join("<br />")}
      </div>
      ${
        data.shippingMethod
          ? `<p style="margin:8px 0 0;font:400 13px/1.5 Arial,Helvetica,sans-serif;color:#5b5b5b;">${escapeHtml(
              data.shippingMethod
            )}</p>`
          : ""
      }
    `
    : ""

  const action = renderAction(data.orderUrl, "View your order")

  const greeting = data.customerName
    ? `Good news, ${data.customerName}.`
    : "Good news."

  const html = renderLayout({
    storeName,
    heading: `Order #${orderNumber} has shipped`,
    intro: greeting,
    blocks: [
      renderParagraph(
        shippedOn
          ? `Everything below left our warehouse on ${shippedOn}.`
          : "Everything below has left our warehouse."
      ),
      itemTable,
      tracking.length
        ? `<h2 style="margin:24px 0 6px;font:700 15px/1.4 Georgia,'Times New Roman',serif;color:#212121;">Tracking</h2>`
        : "",
      trackingRows,
      trackingActions,
      action.html,
      addressBlock,
    ],
  })

  const text = [
    `${storeName} — order #${orderNumber} has shipped`,
    "",
    greeting,
    shippedOn
      ? `Everything below left our warehouse on ${shippedOn}.`
      : "Everything below has left our warehouse.",
    "",
    ...(items.length
      ? ["In this parcel", ...items.map((item) => `- ${item.quantity} × ${item.title}`), ""]
      : []),
    ...(tracking.length
      ? [
          "Tracking",
          ...tracking.flatMap((entry, index) => [
            `${tracking.length > 1 ? `Tracking number ${index + 1}` : "Tracking number"}: ${
              entry.number || "See the carrier's page"
            }`,
            ...(entry.url ? [`Track it: ${entry.url}`] : []),
          ]),
          "",
        ]
      : []),
    action.text,
    "",
    address.length ? `Shipping to\n${address.join("\n")}` : "",
    data.shippingMethod ? `${data.shippingMethod}` : "",
    "",
    `Sent by ${storeName}. If you did not expect this email, you can ignore it.`,
  ]
    .join("\n")

  return { subject: `Order #${orderNumber} has shipped`, html, text }
}
