import { Metadata } from "next"

import Overview from "@modules/account/components/overview"
import { notFound } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { listOrders } from "@lib/data/orders"

export const metadata: Metadata = {
  title: "Account",
  description: "Overview of your account activity.",
}

export default async function OverviewTemplate() {
  const customer = await retrieveCustomer()

  if (!customer) {
    notFound()
  }

  // A failed read leaves the recent-orders block empty rather than taking the
  // whole overview down with it; the orders page reports the failure properly.
  const result = await listOrders(5)

  return (
    <Overview customer={customer} orders={result.ok ? result.orders : null} />
  )
}
