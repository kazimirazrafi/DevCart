import { declineTransferRequest } from "@lib/data/orders"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ErrorMessage from "@modules/checkout/components/error-message"
import { Rule, linkClass } from "@modules/design-system"

type Props = {
  params: Promise<{ id: string; token: string }>
}

/** The decline link: a declined request changes nothing. */
export default async function TransferDeclinedPage({ params }: Props) {
  const { id, token } = await params

  const { success, error } = await declineTransferRequest(id, token)

  return (
    <div className="content-container py-12 small:py-16">
      <div
        className="flex w-full max-w-xl flex-col gap-5"
        data-testid="transfer-declined"
        data-state={success ? "declined" : "failed"}
      >
        <h1 className="font-display text-h1 font-bold text-ink">
          {success ? "Transfer declined" : "That transfer could not be declined"}
        </h1>

        <Rule weight="heavy" />

        {success ? (
          <p className="max-w-prose text-body text-ink/80">
            Order <span className="font-mono text-ink">{id}</span> stays with
            you. Nothing about it has changed.
          </p>
        ) : (
          <>
            <p className="max-w-prose text-body text-ink/80">
              Nothing changed: the order still belongs to whoever it belonged to
              before. The link may have expired, or already been used.
            </p>
            {error && (
              <ErrorMessage error={error} data-testid="transfer-decline-error" />
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
