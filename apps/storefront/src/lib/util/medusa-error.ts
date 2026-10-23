/*
 * The SDK throws a `FetchError extends Error` that keeps the API's message and
 * status but drops the error `code` (see @medusajs/js-sdk's client), so these
 * translations key off Medusa's wording rather than a code.
 *
 * The API's own copy says what broke, not what to do about it, which is what
 * docs/DESIGN.md §5.6 asks an error to say.
 */
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
 * What to show the customer for a failed request.
 *
 * Server actions have to *return* this rather than throw it: a production build
 * replaces a thrown error from a server action with "An error occurred in the
 * Server Components render. The specific message is omitted in production
 * builds", so a thrown message never reaches the customer (measured on K1's
 * rejected quantity change).
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

  // The API's own copy often ends a sentence already; appending a second full
  // stop reads like a typo ("already reviewed this product..").
  const sentence =
    message.charAt(0).toUpperCase() + message.slice(1)

  return sentence.endsWith(".") ? sentence : `${sentence}.`
}

/**
 * The throwing form, for the flows whose caller is a `try`/`catch` around a
 * server action that returns state (checkout, account, orders). Anything a
 * customer reads on a page should use the returned-message form instead.
 */
export function medusaError(error: unknown): never {
  throw new Error(medusaErrorMessage(error))
}
