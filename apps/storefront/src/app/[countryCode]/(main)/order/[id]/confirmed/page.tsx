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

  /*
   * The order id is the address, not the credential. A guest proves they may
   * read the order with the token in this link; a signed-in customer proves it
   * with their session instead, which is why a missing token is not an error on
   * its own. Either way the backend decides, and an order that is not the
   * caller's is the same 404 as one that does not exist.
   */
  const token =
    typeof searchParams.token === "string" ? searchParams.token : undefined

  const order = await retrieveOrder(id, token).catch(() => null)

  if (!order) {
    return notFound()
  }

  return <OrderCompletedTemplate order={order} />
}
