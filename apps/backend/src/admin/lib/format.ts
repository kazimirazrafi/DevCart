/* Display helpers shared by the dashboard and the Orders summary. */

/** Money in the admin's locale; Intl throws on an unknown currency. */
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

/** Compact money for axis labels: "EUR 12.4K". */
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
