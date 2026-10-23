import { HttpTypes } from "@medusajs/types"

import { Rule } from "@modules/design-system"
import AccountNav from "../components/account-nav"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

/**
 * The account shell. Signed in, it is the nav beside the page and the width is
 * shared; signed out, it steps out of the way and the sign-in form is the page.
 */
const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  return (
    <div className="content-container py-10 small:py-16" data-testid="account-page">
      {customer ? (
        <div className="flex flex-col gap-10">
          <div className="grid grid-cols-1 gap-10 small:grid-cols-[220px_1fr]">
            <AccountNav customer={customer} />
            <div className="min-w-0">{children}</div>
          </div>

          <Rule weight="heavy" />

          <p className="max-w-prose text-small text-ink/80">
            Something wrong with an order? Reply to its confirmation email and
            we will pick it up.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">{children}</div>
      )}
    </div>
  )
}

export default AccountLayout
