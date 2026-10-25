import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Rule, linkClass } from "@modules/design-system"
import TransferActions from "@modules/order/components/transfer-actions"

type Props = {
  params: Promise<{ id: string; token: string }>
}

/** What the person who received a transfer request sees: plain type and the two answers. */
export default async function TransferPage({ params }: Props) {
  const { id, token } = await params

  return (
    <div className="content-container py-12 small:py-16">
      <div
        className="flex w-full max-w-xl flex-col gap-5"
        data-testid="transfer-request"
      >
        <h1 className="font-display text-h1 font-bold text-ink">
          Transfer request
        </h1>

        <Rule weight="heavy" />

        <p className="max-w-prose text-body text-ink/80">
          Someone has asked to take over order{" "}
          <span className="font-mono text-ink">{id}</span>.
        </p>

        <p className="max-w-prose text-body text-ink/80">
          If you accept, they take over the order and everything that comes with
          it. If you do not recognise this request, do nothing — the order stays
          with you.
        </p>

        <TransferActions id={id} token={token} />

        <LocalizedClientLink href="/account/orders" className={linkClass}>
          Back to your orders
        </LocalizedClientLink>
      </div>
    </div>
  )
}
