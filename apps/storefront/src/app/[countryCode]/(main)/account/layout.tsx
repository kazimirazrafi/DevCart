import { Metadata } from "next"

import { retrieveCustomer } from "@lib/data/customer"
import AccountLayout from "@modules/account/templates/account-layout"

// Every account page is the customer's own data and stays out of the index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/**
 * The parallel route decides what a visitor gets: the pages when signed in, the
 * sign-in slot when not. Middleware already handles the redirect.
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
