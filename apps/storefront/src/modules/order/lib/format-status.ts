/**
 * Medusa reports an order's fulfillment and payment state in snake case
 * (`not_fulfilled`, `partially_shipped`). This is what the customer reads on
 * their own order, so it is spelled out in sentence case in one place rather
 * than printed raw or re-spelled per component.
 */
export const formatOrderStatus = (status?: string | null) => {
  if (!status) {
    return "Unknown"
  }

  const words = status.split("_").join(" ")

  return words.charAt(0).toUpperCase() + words.slice(1)
}
