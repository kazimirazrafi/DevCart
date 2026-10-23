"use client"

import { HttpTypes } from "@medusajs/types"
import React from "react"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

/**
 * The email is shown, not edited. In Medusa the address a customer signs in
 * with lives on the auth identity, and the customer record's `email` is only a
 * copy; changing the copy would leave the two disagreeing and lock the customer
 * out of the address on their next sign-in. The starter's editor was a stub
 * that reported "Email updated succesfully" while writing nothing, which is
 * worse than saying so.
 */
const ProfileEmail: React.FC<MyInformationProps> = ({ customer }) => {
  return (
    <div className="text-small" data-testid="account-email-editor">
      <div className="flex flex-col gap-1">
        <span className="text-small uppercase text-ink/70">Email</span>
        <span className="font-semibold text-ink" data-testid="current-info">
          {customer.email}
        </span>
      </div>
      <p className="mt-2 max-w-prose text-ink/80">
        This is the address you sign in with, so it can&apos;t be changed here.
        To use a different address, create an account with it.
      </p>
    </div>
  )
}

export default ProfileEmail
