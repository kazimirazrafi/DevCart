import { Metadata } from "next"

import ProfilePhone from "@modules/account//components/profile-phone"
import ProfileBillingAddress from "@modules/account/components/profile-billing-address"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import ProfilePassword from "@modules/account/components/profile-password"
import { notFound } from "next/navigation"
import { listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"
import { Rule } from "@modules/design-system"

export const metadata: Metadata = {
  title: "Profile",
  description: "View and edit your profile.",
}

export default async function Profile() {
  const customer = await retrieveCustomer()
  const regions = await listRegions()

  if (!customer || !regions) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="profile-page-wrapper">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 font-bold text-ink">Profile</h1>
        <p className="max-w-prose text-body text-ink/80">
          Update the name and phone number on your account, send yourself a
          password reset link, or change the billing address your receipts use.
          The email you sign in with is shown here but can&apos;t be changed.
        </p>
      </div>

      <Rule weight="heavy" className="mt-4" />

      <div className="mt-6 flex w-full flex-col gap-8">
        <ProfileName customer={customer} />
        <Rule />
        <ProfileEmail customer={customer} />
        <Rule />
        <ProfilePhone customer={customer} />
        <Rule />
        <ProfilePassword customer={customer} />
        <Rule />
        <ProfileBillingAddress customer={customer} regions={regions} />
      </div>
    </div>
  )
}
