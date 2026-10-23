import { acceptTransferRequest } from "@lib/data/orders"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ErrorMessage from "@modules/checkout/components/error-message"
import { Rule, linkClass } from "@modules/design-system"

type Props = {
  params: Promise<{ id: string; token: string }>
}

/**
 * Where the link in the transfer email lands after accepting. The result is the
 * server's: the request either moved the order to the other account or it did
 * not, and the page says which rather than showing a form.
 */
export default async function TransferAcceptedPage({ params }: Props) {
  const { id, token } = await params

  const { success, error } = await acceptTransferRequest(id, token)

  return (
    <div className="content-container py-12 small:py-16">
      <div
        className="flex w-full max-w-xl flex-col gap-5"
        data-testid="transfer-accepted"
        data-state={success ? "accepted" : "failed"}
      >
        <h1 className="font-display text-h1 font-bold text-ink">
          {success ? "Transfer accepted" : "That transfer could not be accepted"}
        </h1>

        <Rule weight="heavy" />

        {success ? (
          <p className="max-w-prose text-body text-ink/80">
            Order <span className="font-mono text-ink">{id}</span> now belongs to
            the other account. It has left your order history.
          </p>
        ) : (
          <>
            <p className="max-w-prose text-body text-ink/80">
              Nothing changed: the order still belongs to whoever it belonged to
              before. The link may have expired, or already been used.
            </p>
            {error && (
              <ErrorMessage error={error} data-testid="transfer-accept-error" />
            )}
          </>
        )}

        <LocalizedClientLink href="/account/orders" className={linkClass}>
          Back to your orders
        </LocalizedClientLink>
      </div>
    </div>
  )
}
