import { isStripeLike, paymentInfoMap } from "@lib/constants"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Rule } from "@modules/design-system"
import { paymentSummary } from "@modules/order/lib/payment-summary"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const PaymentDetails = ({ order }: PaymentDetailsProps) => {
  const payment = order.payment_collections?.[0].payments?.[0]

  // Stripe keeps the card at `payment_method.card`; other providers set `card_last4`.
  const data = payment?.data as
    | {
        card_last4?: string
        payment_method?: { card?: { last4?: string } }
      }
    | null
    | undefined
  const cardLast4 = data?.card_last4 ?? data?.payment_method?.card?.last4

  const summary = paymentSummary(order)
  const providerTitle = payment
    ? (paymentInfoMap[payment.provider_id]?.title ?? payment.provider_id)
    : ""

  return (
    <div>
      <h2 className="my-6 font-display text-h3 font-bold">Payment</h2>
      <div>
        {payment && (
          <div className="flex w-full items-start gap-x-1">
            <div className="flex w-1/3 flex-col">
              <p className="mb-1 text-small font-semibold text-ink">
                Payment method
              </p>
              <p className="text-small text-ink/80" data-testid="payment-method">
                {providerTitle}
              </p>
            </div>
            <div className="flex w-2/3 flex-col">
              <p className="mb-1 text-small font-semibold text-ink">
                Payment details
              </p>
              <div className="flex items-center gap-2 text-small text-ink/80">
                <span className="flex h-7 w-fit items-center border border-ink p-2">
                  {paymentInfoMap[payment.provider_id]?.icon}
                </span>
                <p data-testid="payment-amount">
                  {isStripeLike(payment.provider_id) && cardLast4
                    ? `**** **** **** ${cardLast4}`
                    : `${convertToLocale({
                        amount: payment.amount,
                        currency_code: order.currency_code,
                      })} paid at ${new Date(
                        payment.created_at ?? ""
                      ).toLocaleString()}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {payment && (
          <div
            className="mt-4 border-l-2 border-ink pl-3"
            data-testid="payment-status"
            data-payment-state={summary.state}
          >
            <p className="text-small font-semibold text-ink">
              {summary.headline}
            </p>
            <p className="text-small text-ink/80">{summary.detail}</p>
          </div>
        )}
      </div>

      <Rule className="mt-8" />
    </div>
  )
}

export default PaymentDetails
