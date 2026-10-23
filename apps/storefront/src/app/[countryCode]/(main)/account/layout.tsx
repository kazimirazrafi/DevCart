import { Metadata } from "next"

import { retrieveCustomer } from "@lib/data/customer"
import AccountLayout from "@modules/account/templates/account-layout"

// Every account page is the customer's own data and stays out of the index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/**
 * The account's own slot decides what a visitor gets: the pages inside it when
 * they are signed in, the sign-in page when they are not. Middleware already
 * sends a signed-out visitor from `/account/<page>` to the sign-in page, so
 * this only has to answer the question, never redirect.
 */
export default async function AccountPageLayout({
  dashboard,
  login,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
}) {
  const customer = await retrieveCustomer().catch(() => null)

  return (
    <AccountLayout customer={customer}>
      {customer ? dashboard : login}
    </AccountLayout>
  )
}
