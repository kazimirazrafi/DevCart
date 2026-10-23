"use client"

import { acceptTransferRequest, declineTransferRequest } from "@lib/data/orders"
import ErrorMessage from "@modules/checkout/components/error-message"
import { Button } from "@modules/design-system"
import { useState } from "react"

type TransferStatus = "pending" | "success" | "error"

/**
 * The two answers to a transfer request. Both stay on screen while the request
 * is in flight and while the result is not a failure, so a second click cannot
 * race the first; a success replaces them with the outcome.
 */
const TransferActions = ({ id, token }: { id: string; token: string }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [status, setStatus] = useState<{
    accept: TransferStatus | null
    decline: TransferStatus | null
  } | null>({
    accept: null,
    decline: null,
  })

  const acceptTransfer = async () => {
    setStatus({ accept: "pending", decline: null })
    setErrorMessage(null)

    const { success, error } = await acceptTransferRequest(id, token)

    if (error) setErrorMessage(error)
    setStatus({ accept: success ? "success" : "error", decline: null })
  }

  const declineTransfer = async () => {
    setStatus({ accept: null, decline: "pending" })
    setErrorMessage(null)

    const { success, error } = await declineTransferRequest(id, token)

    if (error) setErrorMessage(error)
    setStatus({ accept: null, decline: success ? "success" : "error" })
  }

  /*
   * Only a success takes the buttons away. A failed attempt leaves them, so the
   * customer can try again without reloading the page they arrived on.
   */
  const resolved = status?.accept === "success" || status?.decline === "success"

  return (
    <div className="flex flex-col gap-4">
      {status?.accept === "success" && (
        <p
          className="border-l-2 border-riso-green pl-3 text-body text-ink"
          data-testid="transfer-status"
          data-state="accepted"
        >
          Transfer accepted. The order now belongs to the other account.
        </p>
      )}

      {status?.decline === "success" && (
        <p
          className="border-l-2 border-riso-green pl-3 text-body text-ink"
          data-testid="transfer-status"
          data-state="declined"
        >
          Transfer declined. The order stays with you.
        </p>
      )}

      {!resolved && (
        <div className="flex flex-wrap gap-3">
          <Button
            size="large"
            onClick={acceptTransfer}
            loading={status?.accept === "pending"}
            disabled={status?.accept === "pending" || status?.decline === "pending"}
            data-testid="accept-transfer-button"
          >
            Accept transfer
          </Button>
          <Button
            size="large"
            variant="secondary"
            onClick={declineTransfer}
            loading={status?.decline === "pending"}
            disabled={status?.accept === "pending" || status?.decline === "pending"}
            data-testid="decline-transfer-button"
          >
            Decline transfer
          </Button>
        </div>
      )}

      {errorMessage && (
        <ErrorMessage error={errorMessage} data-testid="transfer-actions-error" />
      )}
    </div>
  )
}

export default TransferActions
