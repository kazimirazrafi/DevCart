/**
 * Display helpers shared by the admin's own pages and widgets.
 *
 * Kept in one place so the dashboard and the Orders page's sales summary can
 * never disagree about how a figure is written.
 */

/**
 * Money as the admin's locale writes it.
 *
 * An unknown currency code makes `Intl.NumberFormat` throw, and a figure that
 * cannot be formatted is still better shown than swallowed — hence the plain
 * fallback.
 */
export const formatMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`
  }
}

/**
 * Money for an axis label, where the space a full figure takes is the problem:
 * "EUR 12.4K" rather than "EUR 12,400.00".
 *
 * Same fallback rule as `formatMoney` — a currency the browser does not know is
 * still printed, not thrown away.
 */
export const compactMoney = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount)
  } catch {
    return `${Math.round(amount)} ${currency.toUpperCase()}`
  }
}
