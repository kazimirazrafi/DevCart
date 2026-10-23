import { retrieveCustomer } from "@lib/data/customer"
import { retrieveOrder } from "@lib/data/orders"
import OrderDetailsTemplate from "@modules/order/templates/order-details-template"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"

type Props = {
  params: Promise<{ id: string }>
}

/*
 * An order is only shown in the account when it is the signed-in customer's.
 * The backend already refuses a read that is not the owner's (and a guest's
 * without the token from their confirmation link), so this page reads with the
 * session it has and keeps its own check: a read that fails, or one that
 * belongs to someone else, is the same 404 here, and the page must not confirm
 * that the id exists.
 *
 * `cache` so the metadata and the page share one pair of requests.
 */
const loadOwnOrder = cache(async (id: string) => {
  const [order, customer] = await Promise.all([
    retrieveOrder(id),
    retrieveCustomer(),
  ])

  if (!customer || !order || order.customer_id !== customer.id) {
    return null
  }

  return order
})

export async function generateMetadata(props: Props): Promise<Metadata> {
  const order = await loadOwnOrder((await props.params).id)

  /*
   * Deliberately no `notFound()` in here, and no order number unless the order
   * is the caller's: notFound() raised from generateMetadata renders the root
   * not-found page instead of the storefront's (the trap C3 hit), and the title
   * must not name an order the visitor may not read.
   */
  return {
    title: order ? `Order #${order.display_id}` : "Order",
    description: "View your order",
  }
}

export default async function OrderDetailPage(props: Props) {
  const order = await loadOwnOrder((await props.params).id)

  if (!order) {
    notFound()
  }

  return <OrderDetailsTemplate order={order} />
}
