/** What a checkout step's action returns, plus the checks the server runs. */
export type CheckoutStepState = {
  /** A problem with the step as a whole, shown above the submit button. */
  message?: string
  /** A problem with one field, keyed by its name attribute. */
  fields?: Record<string, string>
} | null

/* Stricter than type="email", which accepts name@host with no dot. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const isValidEmail = (value: string) => EMAIL_PATTERN.test(value.trim())
