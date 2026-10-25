"use client"

import React, { useEffect, useActionState, useState } from "react"

import { HttpTypes } from "@medusajs/types"
import { Input } from "@modules/design-system"
import {
  updateCustomerPhone,
  type CustomerProfileState,
} from "@lib/data/customer"
import { useRouter } from "next/navigation"

import AccountInfo from "../account-info"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

const ProfilePhone: React.FC<MyInformationProps> = ({ customer }) => {
  const router = useRouter()
  const [successState, setSuccessState] = useState(false)
  // Controlled so a rejected number stays next to its message.
  const [phone, setPhone] = useState(customer.phone ?? "")

  const [state, formAction] = useActionState<
    CustomerProfileState,
    FormData
  >(updateCustomerPhone, null)

  const fields = state && !state.ok ? state.fields ?? {} : {}

  useEffect(() => {
    if (!state) return

    setSuccessState(state.ok)

    if (state.ok) {
      router.refresh()
    }
  }, [state, router])

  const clearState = () => {
    setSuccessState(false)
  }

  return (
    <form action={formAction} className="w-full">
      <AccountInfo
        label="Phone"
        currentInfo={customer.phone || "Not set"}
        isSuccess={successState}
        isError={!!state && !state.ok}
        errorMessage={state && !state.ok ? state.message : undefined}
        clearState={clearState}
        data-testid="account-phone-editor"
      >
        <div className="grid grid-cols-1 gap-4">
          <Input
            id="profile-phone"
            label="Phone (optional)"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            error={fields.phone}
            hint="Leave it empty to remove the number."
            data-testid="phone-input"
          />
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfilePhone
