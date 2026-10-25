import {
  EmailContent,
  escapeHtml,
  renderAction,
  renderLayout,
  renderParagraph,
} from "./layout"

export type LowStockAlertData = {
  storeName?: string
  /** The threshold that produced this mail, so the number has a meaning. */
  threshold?: number
  items: {
    /** Product or variant name where the store knows one. */
    title?: string | null
    sku?: string | null
    location?: string | null
    available: number
  }[]
  adminUrl?: string
}

/** One email listing every shortage the job found, not one per product. */
export const lowStockAlert = (data: LowStockAlertData): EmailContent => {
  const storeName = data.storeName ?? "DevCart"
  const threshold = data.threshold ?? 5
  const items = (data.items ?? []).filter(
    (item) => typeof item?.available === "number"
  )
  const count = items.length

  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;font:400 14px/1.5 Arial,Helvetica,sans-serif;color:#212121;">
          ${escapeHtml(item.title || item.sku || "Unnamed item")}
          <div style="font:400 12px/1.5 Arial,Helvetica,sans-serif;color:#5b5b5b;">
            ${escapeHtml(item.sku ?? "no SKU")}${item.location ? ` · ${escapeHtml(item.location)}` : ""}
          </div>
        </td>
        <td align="right" style="padding:8px 0;font:700 14px/1.5 Arial,Helvetica,sans-serif;color:#212121;white-space:nowrap;">
          ${item.available} left
        </td>
      </tr>
    `
    )
    .join("")

  const table = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #d6d3c9;margin:0 0 8px;">
      ${rows}
    </table>
  `

  const adminUrl = data.adminUrl
  const action = adminUrl
    ? renderAction(adminUrl, "Open the admin")
    : { html: "", text: "" }

  const heading =
    count === 1 ? "One product is running low" : `${count} products are running low`

  const html = renderLayout({
    storeName,
    heading,
    intro: `Stock is at or below ${threshold} at the time of this check.`,
    blocks: [table, renderParagraph("Restock or raise the threshold if this is expected."), action.html],
    footer: `Sent by ${storeName} automatically. The same product is not reported again for 24 hours.`,
  })

  const text = [
    `${storeName} — ${heading}`,
    "",
    `Stock is at or below ${threshold} at the time of this check.`,
    "",
    ...items.map(
      (item) =>
        `- ${item.title || item.sku || "Unnamed item"}${
          item.location ? ` (${item.location})` : ""
        }: ${item.available} left${item.sku ? ` [${item.sku}]` : ""}`
    ),
    "",
    adminUrl ? `Open the admin: ${adminUrl}` : "",
    "",
    `Sent by ${storeName} automatically. The same product is not reported again for 24 hours.`,
  ].join("\n")

  return { subject: `${storeName}: ${heading}`, html, text }
}
