/**
 * The shared shell for every email this store sends.
 *
 * Email clients are not browsers: they do not all read a stylesheet, and the
 * ones that do disagree about which properties survive. So the markup is a
 * single column of tables with inline styles, in the same ink-on-paper palette
 * as the storefront, and no web fonts — the display face is asked for by name
 * and falls back to Georgia where it is missing.
 */

export type EmailContent = {
  subject: string
  html: string
  text: string
}

const INK = "#212121"
const STOCK = "#ffffff"
const MUTED = "#5b5b5b"
const RULE = "#d6d3c9"

/** Every value that reaches the HTML passes through here. */
export const escapeHtml = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

/** Medusa holds amounts as major units (58.5 is EUR 58.50), so no scaling. */
export const formatMoney = (
  amount: number | null | undefined,
  currencyCode: string | null | undefined
): string => {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return ""
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currencyCode ?? "eur").toUpperCase(),
    }).format(amount)
  } catch {
    // An unknown currency code must not take the whole email down.
    return `${amount.toFixed(2)} ${(currencyCode ?? "").toUpperCase()}`.trim()
  }
}

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) {
    return ""
  }

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
}

/**
 * A button-shaped link. The URL is repeated as text below it, because a link
 * that is only a button is unusable wherever images or styles are stripped.
 */
export const renderAction = (href: string, label: string): { html: string; text: string } => ({
  html: `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="background:${INK};">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 22px;font:600 15px/1.2 Arial,Helvetica,sans-serif;color:${STOCK};text-decoration:none;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 24px;font:13px/1.5 Arial,Helvetica,sans-serif;color:${MUTED};word-break:break-all;">${escapeHtml(href)}</p>
  `,
  text: `${label}: ${href}`,
})

type LayoutArgs = {
  storeName: string
  heading: string
  intro: string
  /** Already-built HTML blocks, in order. */
  blocks?: string[]
  footer?: string
}

export const renderLayout = ({
  storeName,
  heading,
  intro,
  blocks = [],
  footer,
}: LayoutArgs): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f2f0e9;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f0e9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${STOCK};border:1px solid ${INK};">
            <tr>
              <td style="padding:20px 24px;border-bottom:1px solid ${INK};">
                <span style="font:700 18px/1.2 Georgia,'Times New Roman',serif;letter-spacing:.02em;color:${INK};">${escapeHtml(storeName)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 8px;">
                <h1 style="margin:0 0 12px;font:700 26px/1.15 Georgia,'Times New Roman',serif;color:${INK};">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 16px;font:15px/1.6 Arial,Helvetica,sans-serif;color:${INK};">${escapeHtml(intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px;font:15px/1.6 Arial,Helvetica,sans-serif;color:${INK};">
                ${blocks.join("\n")}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 24px 24px;border-top:1px solid ${RULE};">
                <p style="margin:16px 0 0;font:12px/1.6 Arial,Helvetica,sans-serif;color:${MUTED};">
                  ${escapeHtml(footer ?? `Sent by ${storeName}. If you did not expect this email, you can ignore it.`)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

/** A bordered block of label/value rows, used for money and addresses. */
export const renderRows = (
  rows: { label: string; value: string; strong?: boolean }[]
): string => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${RULE};padding:8px 0;">
    ${rows
      .map(
        (row) => `
      <tr>
        <td style="padding:6px 0;font:${row.strong ? "600" : "400"} 14px/1.5 Arial,Helvetica,sans-serif;color:${row.strong ? INK : MUTED};">${escapeHtml(row.label)}</td>
        <td align="right" style="padding:6px 0;font:${row.strong ? "700" : "400"} 14px/1.5 Arial,Helvetica,sans-serif;color:${INK};white-space:nowrap;">${escapeHtml(row.value)}</td>
      </tr>
    `
      )
      .join("")}
  </table>
`

export const renderParagraph = (text: string): string =>
  `<p style="margin:0 0 16px;">${escapeHtml(text)}</p>`

export const renderLines = (lines: string[]): string =>
  lines
    .filter(Boolean)
    .map((line) => `<div style="margin:0 0 2px;">${escapeHtml(line)}</div>`)
    .join("")
