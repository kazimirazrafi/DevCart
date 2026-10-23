import { Metadata } from "next"
import { notFound } from "next/navigation"

import AddressBook from "@modules/account/components/address-book"

import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"
import { Rule } from "@modules/design-system"

export const metadata: Metadata = {
  title: "Addresses",
  description: "View your addresses",
}

export default async function Addresses(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const customer = await retrieveCustomer()
  const region = await getRegion(countryCode)

  if (!customer || !region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 font-bold text-ink">
          Saved addresses
        </h1>
        <p className="max-w-prose text-body text-ink/80">
          Add, edit and remove the addresses you use at checkout. Your default
          shipping address is filled in for you when you start an order.
        </p>
      </div>

      <Rule weight="heavy" className="mt-4" />

      <AddressBook customer={customer} region={region} />
    </div>
  )
}
