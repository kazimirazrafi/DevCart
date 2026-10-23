import {
  EmailContent,
  escapeHtml,
  formatDate,
  formatMoney,
  renderAction,
  renderLayout,
  renderParagraph,
  renderRows,
} from "./layout"

export type OrderConfirmationData = {
  storeName?: string
  orderNumber: string | number
  orderDate?: string
  customerName?: string
  currencyCode?: string
  items?: { title?: string; quantity?: number; total?: number }[]
  subtotal?: number
  shipping?: number
  tax?: number
  total?: number
  shippingAddress?: string[]
  shippingMethod?: string | null
  orderUrl: string
}

const amount = (value: unknown): number | undefined => {
  const parsed = typeof value === "number" ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * What the customer keeps: the order number, what they bought, what it cost and
 * where it is going. It deliberately repeats the confirmation page rather than
 * inventing anything the page does not show, so the two cannot disagree.
 */
export const orderConfirmation = (data: OrderConfirmationData): EmailContent => {
  const storeName = data.storeName ?? "DevCart"
  const orderNumber = String(data.orderNumber ?? "")
  const currency = data.currencyCode ?? "eur"
  const money = (value: unknown) => formatMoney(amount(value), currency)

  const items = (data.items ?? [])
    .map((item) => ({
      title: String(item.title ?? "Item"),
      quantity: Number(item.quantity ?? 1),
      total: amount(item.total),
    }))
    .filter((item) => item.title)

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;font:400 14px/1.5 Arial,Helvetica,sans-serif;color:#212121;">
          ${escapeHtml(item.title)} <span style="color:#5b5b5b;">× ${item.quantity}</span>
        </td>
        <td align="right" style="padding:8px 0;font:400 14px/1.5 Arial,Helvetica,sans-serif;color:#212121;white-space:nowrap;">
          ${escapeHtml(money(item.total))}
        </td>
      </tr>
    `
    )
    .join("")

  const itemTable = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #d6d3c9;margin:0 0 8px;">
      ${itemRows}
    </table>
  `

  const totals = renderRows([
    { label: "Subtotal", value: money(data.subtotal) },
    ...(amount(data.shipping) ? [{ label: "Shipping", value: money(data.shipping) }] : []),
    ...(amount(data.tax) ? [{ label: "Tax", value: money(data.tax) }] : []),
    { label: "Total", value: money(data.total), strong: true },
  ])

  const address = (data.shippingAddress ?? []).filter(Boolean)

  const shippingBlock = address.length
    ? `
      <h2 style="margin:24px 0 6px;font:700 15px/1.4 Georgia,'Times New Roman',serif;color:#212121;">Delivering to</h2>
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

  const greeting = data.customerName ? `Thanks, ${data.customerName}.` : "Thanks."

  const html = renderLayout({
    storeName,
    heading: `Order #${orderNumber} confirmed`,
    intro: greeting,
    blocks: [
      renderParagraph(
        `We have your order and will let you know when it ships. Placed on ${formatDate(
          data.orderDate
        )}.`
      ),
      itemTable,
      totals,
      action.html,
      shippingBlock,
    ],
  })

  const text = [
    `${storeName} — order #${orderNumber} confirmed`,
    "",
    greeting,
    `Placed on ${formatDate(data.orderDate)}.`,
    "",
    "Items",
    ...items.map((item) => `- ${item.quantity} × ${item.title} — ${money(item.total)}`),
    "",
    `Subtotal: ${money(data.subtotal)}`,
    ...(amount(data.shipping) ? [`Shipping: ${money(data.shipping)}`] : []),
    ...(amount(data.tax) ? [`Tax: ${money(data.tax)}`] : []),
    `Total: ${money(data.total)}`,
    "",
    action.text,
    "",
    address.length ? `Delivering to\n${address.join("\n")}` : "",
    data.shippingMethod ? `${data.shippingMethod}` : "",
    "",
    `Sent by ${storeName}. If you did not expect this email, you can ignore it.`,
  ]
    // Blank entries are the paragraph breaks; the fallback has to be readable
    // in a plain-text client, not a wall of lines.
    .join("\n")

  return { subject: `Order #${orderNumber} confirmed`, html, text }
}
