import { retrieveOrder } from "@lib/data/orders"
import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}
export const metadata: Metadata = {
  title: "Order confirmed",
  description: "Your order is confirmed.",
  // The page carries an access token in its query string, so it is never
  // indexed and never followed.
  robots: { index: false, follow: false },
}

export default async function OrderConfirmedPage(props: Props) {
  const [{ id }, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ])

  // The order id is the address, not the credential: a guest proves access with
  // the link's token, a customer with their session. The backend decides either
  // way, and someone else's order is the same 404 as a missing one.
  const token =
    typeof searchParams.token === "string" ? searchParams.token : undefined

  const order = await retrieveOrder(id, token).catch(() => null)

  if (!order) {
    return notFound()
  }

  return <OrderCompletedTemplate order={order} />
}
