/**
 * The shape a checkout step's form action hands back to the component that
 * rendered it, plus the checks the server runs on what the customer typed.
 *
 * The server is the authority: the browser's own `required`/`type=email`
 * checking is a convenience for the common empty case, but a value that gets
 * through it still has to survive these checks before it reaches the cart.
 */
export type CheckoutStepState = {
  /** Something about the step as a whole, shown above its submit button. */
  message?: string
  /** What is wrong with a single field, keyed by its `name` attribute. */
  fields?: Record<string, string>
} | null

/*
 * Deliberately not `<input type="email">`'s rule, which accepts `name@host`
 * with no dot. A checkout address needs a domain that could receive mail.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const isValidEmail = (value: string) => EMAIL_PATTERN.test(value.trim())
