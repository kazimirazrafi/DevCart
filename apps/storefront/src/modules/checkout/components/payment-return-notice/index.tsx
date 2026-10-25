import type { PaymentFailure } from "@lib/util/payment-status"

import ErrorMessage from "../error-message"

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
