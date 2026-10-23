import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Rule, linkClass } from "@modules/design-system"
import { formatOrderStatus } from "@modules/order/lib/format-status"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: HttpTypes.StoreOrder[] | null
}

/*
 * The account's landing page: who is signed in, how complete the profile is and
 * what was ordered recently. It is a page of bands rather than a card — the
 * heading, the two facts and the orders each sit between rules, like the rest of
 * the storefront.
 *
 * It used to be wrapped in `hidden small:block`, which made the whole overview
 * disappear on a phone; the grid below stacks instead. The test ids are the ones
 * the account checks from earlier phases read, so they stay on the same facts.
 */
const Overview = ({ customer, orders }: OverviewProps) => {
  const firstName = customer?.first_name ?? ""

  return (
    <div className="flex w-full flex-col gap-6" data-testid="overview-page-wrapper">
      <div className="flex flex-col gap-2">
        <h1
          className="font-display text-h1 font-bold break-words text-ink"
          data-testid="welcome-message"
          data-value={customer?.first_name}
        >
          {firstName ? `Hello ${firstName}` : "Your account"}
        </h1>
        <p className="text-small text-ink/70">
          Signed in as:{" "}
          <span
            className="font-mono text-ink"
            data-testid="customer-email"
            data-value={customer?.email}
          >
            {customer?.email}
          </span>
        </p>
      </div>

      <Rule weight="heavy" />

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 small:grid-cols-4">
        <div className="flex flex-col gap-1">
          <dt className="text-small text-ink/70">Profile completed</dt>
          <dd
            className="font-mono text-lead font-semibold text-ink"
            data-testid="customer-profile-completion"
            data-value={getProfileCompletion(customer)}
          >
            {getProfileCompletion(customer)}%
          </dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="text-small text-ink/70">Addresses saved</dt>
          <dd
            className="font-mono text-lead font-semibold text-ink"
            data-testid="addresses-count"
            data-value={customer?.addresses?.length || 0}
          >
            {customer?.addresses?.length || 0}
          </dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="text-small text-ink/70">Name</dt>
          <dd className="text-small text-ink">
            {customer?.first_name || customer?.last_name
              ? [customer?.first_name, customer?.last_name]
                  .filter(Boolean)
                  .join(" ")
              : "Not set"}
          </dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="text-small text-ink/70">Phone</dt>
          <dd className="text-small text-ink">{customer?.phone || "Not set"}</dd>
        </div>
      </dl>

      <Rule className="mt-2" />

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="font-display text-h3 font-bold text-ink">
            Recent orders
          </h2>
          <LocalizedClientLink href="/account/orders" className={linkClass}>
            All orders
          </LocalizedClientLink>
        </div>

        <ul className="flex flex-col gap-4" data-testid="orders-wrapper">
          {orders && orders.length > 0 ? (
            orders.slice(0, 5).map((order) => (
              <li key={order.id} data-testid="order-wrapper" data-value={order.id}>
                <LocalizedClientLink
                  href={`/account/orders/details/${order.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 border border-ink bg-stock p-4 transition-colors hover:bg-ink/5"
                >
                  <span className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                    <span
                      className="font-mono text-body font-semibold text-ink"
                      data-testid="order-id"
                      data-value={order.display_id}
                    >
                      #{order.display_id}
                    </span>
                    <span
                      className="text-small text-ink/70"
                      data-testid="order-created-date"
                    >
                      {new Date(order.created_at).toDateString()}
                    </span>
                    <span className="text-small text-ink/70">
                      {formatOrderStatus(order.fulfillment_status)}
                    </span>
                  </span>
                  <span className="flex items-baseline gap-4">
                    <span
                      className="font-mono text-small text-ink"
                      data-testid="order-amount"
                      data-value={order.total}
                    >
                      {convertToLocale({
                        amount: order.total,
                        currency_code: order.currency_code,
                      })}
                    </span>
                    <span className="text-small text-ink" data-testid="open-order-button">
                      View
                    </span>
                  </span>
                </LocalizedClientLink>
              </li>
            ))
          ) : (
            <li
              className="flex flex-col items-start gap-2 border border-ink bg-stock p-4"
              data-testid="no-orders-message"
            >
              <span className="text-body text-ink">
                {orders === null
                  ? "Recent orders could not be loaded."
                  : "No recent orders"}
              </span>
              <LocalizedClientLink href="/store" className={linkClass}>
                {orders === null ? "Try again" : "Start shopping"}
              </LocalizedClientLink>
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}

const getProfileCompletion = (customer: HttpTypes.StoreCustomer | null) => {
  let count = 0

  if (!customer) {
    return 0
  }

  if (customer.email) {
    count++
  }

  if (customer.first_name && customer.last_name) {
    count++
  }

  if (customer.phone) {
    count++
  }

  const billingAddress = customer.addresses?.find(
    (addr) => addr.is_default_billing
  )

  if (billingAddress) {
    count++
  }

  return (count / 4) * 100
}

export default Overview
