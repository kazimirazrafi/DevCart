import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { retrieveCustomer } from "@lib/data/customer"
import { listOrders } from "@lib/data/orders"
import OrderOverview from "@modules/account/components/order-overview"
import TransferRequestForm from "@modules/account/components/transfer-request-form"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ErrorMessage from "@modules/checkout/components/error-message"
import { Rule, linkClass } from "@modules/design-system"
import { Pagination } from "@modules/store/components/pagination"

export const metadata: Metadata = {
  title: "Orders",
  description: "Your previous orders and their status.",
}

const PAGE_SIZE = 10

const parsePage = (value: string | string[] | undefined) => {
  const raw = Array.isArray(value) ? value[0] : value
  const page = Number.parseInt(raw ?? "", 10)

  return Number.isFinite(page) && page > 0 ? page : 1
}

/**
 * The customer's own orders, newest first. The page never asks the Store API for
 * "some" orders and filters afterwards: `/store/orders` takes the customer from
 * the request's own authentication, so what it returns is what this page shows.
 */
export default async function Orders(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Middleware already sends a signed-out visitor to sign in; a page that shows
  // order history still refuses to render without a customer to own it.
  const customer = await retrieveCustomer()

  if (!customer) {
    notFound()
  }

  const page = parsePage((await props.searchParams).page)
  const result = await listOrders(PAGE_SIZE, (page - 1) * PAGE_SIZE)

  const count = result.ok ? result.count : 0
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))

  /*
   * A page past the end of the history is a stale link — the order it was
   * pointing at is gone, or the URL was edited. Send the customer to the last
   * page that exists instead of an empty list under a non-empty count.
   */
  if (result.ok && page > pageCount) {
    redirect(`/account/orders?page=${pageCount}`)
  }

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-h1 font-bold text-ink">Orders</h1>
        {result.ok && count > 0 && (
          <p
            className="font-mono text-small text-ink/70"
            data-testid="orders-count"
            data-value={count}
          >
            {count} {count === 1 ? "order" : "orders"}
          </p>
        )}
      </div>

      <Rule weight="heavy" className="mt-4" />

      {result.ok ? (
        <div className="mt-8">
          <OrderOverview orders={result.orders} />
        </div>
      ) : (
        <div
          className="mt-8 flex flex-col items-start gap-4"
          data-testid="orders-error"
        >
          <ErrorMessage
            error={result.message}
            data-testid="orders-error-message"
          />
          <LocalizedClientLink href="/account/orders" className={linkClass}>
            Try again
          </LocalizedClientLink>
        </div>
      )}

      {result.ok && pageCount > 1 && (
        <Pagination
          page={page}
          totalPages={pageCount}
          data-testid="orders-pagination"
        />
      )}

      <Rule className="my-10" />

      <TransferRequestForm />
    </div>
  )
}
