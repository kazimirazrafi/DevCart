"use client"

import React, { useActionState } from "react"

import { Button } from "@modules/design-system"
import { requestPasswordReset } from "@lib/data/password-reset"
import { HttpTypes } from "@medusajs/types"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

/**
 * Sends the reset link the customer already has a page for (E2), rather than
 * asking for the current password: Medusa's customer password is changed with
 * the single-use token from that email, so collecting the old one here would be
 * a second, weaker path to the same write.
 */
const ProfilePassword: React.FC<MyInformationProps> = ({ customer }) => {
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
    null
  )

  return (
    <div className="text-small" data-testid="account-password-editor">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-small uppercase text-ink/70">Password</span>
          <span className="max-w-prose text-ink/80">
            We email a reset link to{" "}
            <span className="font-semibold text-ink">{customer.email}</span>. It
            works once and expires in 15 minutes.
          </span>
        </div>

        <form action={formAction}>
          <input type="hidden" name="email" value={customer.email} />
          <Button
            type="submit"
            variant="secondary"
            loading={isPending}
            data-testid="send-reset-link"
          >
            Send reset link
          </Button>
        </form>
      </div>

      {state?.state === "success" && (
        <p
          role="status"
          className="mt-3 border-l-2 border-riso-green pl-3 text-ink"
          data-testid="password-reset-sent"
        >
          Check the inbox for {state.email}. Open the link to choose a new
          password.
        </p>
      )}

      {state?.state === "error" && (
        <p
          role="alert"
          className="mt-3 border-l-2 border-riso-pink pl-3 text-ink"
          data-testid="password-reset-error"
        >
          {state.error}
        </p>
      )}
    </div>
  )
}

export default ProfilePassword
