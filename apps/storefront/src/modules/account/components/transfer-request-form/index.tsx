"use client"

import { createTransferRequest } from "@lib/data/orders"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { Input } from "@modules/design-system"
import { useActionState, useState } from "react"

/*
 * An order placed as a guest belongs to no account. Pasting its id here asks
 * Medusa to email the address on that order a link that moves it over, which is
 * the only way to attach it without an admin.
 */
export default function TransferRequestForm() {
  const [state, formAction] = useActionState(createTransferRequest, {
    success: false,
    error: null,
    order: null,
  })

  /*
   * Controlled: a rejected id has to stay in the field the customer must
   * correct. React resets an uncontrolled input once a form action returns
   * (measured in K2), which would empty the very field the message points at.
   */
  const [orderId, setOrderId] = useState("")

  return (
    <section
      aria-labelledby="order-transfer-heading"
      className="flex w-full flex-col gap-6"
      data-testid="transfer-request-form"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="order-transfer-heading"
          className="font-display text-h3 font-bold text-ink"
        >
          Order transfers
        </h2>
        <p className="max-w-prose text-small text-ink/80">
          Placed an order before you had an account? Connect it here and it will
          appear in this history.
        </p>
      </div>

      <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
        <Input
          id="order-id"
          name="order_id"
          label="Order ID"
          placeholder="order_01H8XYZ"
          hint="The id in the link of the order's confirmation email."
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
          data-testid="order-id-input"
        />

        <SubmitButton
          variant="secondary"
          size="small"
          className="self-start"
          data-testid="request-transfer-button"
        >
          Request transfer
        </SubmitButton>
      </form>

      {state.error && (
        <ErrorMessage error={state.error} data-testid="transfer-error" />
      )}

      {state.success && state.order && (
        <p
          role="status"
          className="border-l-2 border-riso-green pl-3 text-small text-ink"
          data-testid="transfer-success"
        >
          Transfer requested. We emailed {state.order.email} a link to confirm
          it.
        </p>
      )}
    </section>
  )
}
