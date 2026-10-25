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
 * An order is shown only to the customer who owns it. The backend already refuses
 * anyone else, and this page keeps its own check so a failed or foreign read is
 * the same 404. `cache` lets the metadata and the page share one read.
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

  // No notFound() here: raised from generateMetadata it renders the root
  // not-found page, and the title must not name an order the visitor cannot read.
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
