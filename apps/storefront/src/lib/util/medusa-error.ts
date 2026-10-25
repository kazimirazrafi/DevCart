/* The SDK keeps the API's message and status but drops the error code, so these
 * translations key off Medusa's wording. */
const CUSTOMER_MESSAGES: { match: RegExp; message: string }[] = [
  {
    match: /does not have the required inventory/i,
    message:
      "There isn't enough stock left for that quantity. Lower it and try again.",
  },
  {
    match: /promotion code .* is invalid/i,
    message: "That promotion code is not valid. Check it and try again.",
  },
  {
    match: /failed to fetch|fetch failed|network/i,
    message: "Could not reach the store. Check your connection and try again.",
  },
]

/**
 * What to show the customer for a failed request. Server actions have to return
 * this rather than throw it: production replaces a thrown message with a generic
 * one, so the customer would never see it.
 */
export default function medusaErrorMessage(error: unknown): string {
  const message =
    error instanceof Error && error.message ? error.message : ""
  const status = (error as { status?: number })?.status

  if (!message) {
    console.error("Store API request failed:", error)
    return "Something went wrong. Try again."
  }

  console.error(
    `Store API request failed${status ? ` (${status})` : ""}: ${message}`
  )

  const translation = CUSTOMER_MESSAGES.find((entry) =>
    entry.match.test(message)
  )

  if (translation) {
    return translation.message
  }

  // The API's copy may already end with a full stop.
  const sentence =
    message.charAt(0).toUpperCase() + message.slice(1)

  return sentence.endsWith(".") ? sentence : `${sentence}.`
}

/** The throwing form, for callers that catch a server action's error. */
export function medusaError(error: unknown): never {
  throw new Error(medusaErrorMessage(error))
}
