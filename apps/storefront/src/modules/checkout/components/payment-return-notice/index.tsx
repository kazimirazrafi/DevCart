import type { PaymentFailure } from "@lib/util/payment-status"

import ErrorMessage from "../error-message"

/**
 * Why the customer is back on the checkout after paying elsewhere.
 *
 * A bounced card and a payment the bank is still clearing look identical in the
 * URL unless the message says which it is, and the second one must not be
 * retried — so it is announced as a status rather than as an error, and the
 * copy is the one from `payment-status`. Shared by the payment step and the
 * review step because the customer can land on either.
 */
const PaymentReturnNotice = ({
  failure,
}: {
  failure?: PaymentFailure | null
}) => {
  if (!failure) {
    return null
  }

  if (failure.kind === "payment_pending") {
    return (
      <p
        role="status"
        className="max-w-prose border-l-2 border-ink pl-3 text-small text-ink"
        data-testid="payment-return-pending"
      >
        {failure.message}
      </p>
    )
  }

  return (
    <ErrorMessage
      error={failure.message}
      data-testid="payment-return-error-message"
    />
  )
}

export default PaymentReturnNotice
