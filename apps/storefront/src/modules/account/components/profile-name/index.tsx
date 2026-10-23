"use client"

import React, { useEffect, useActionState, useState } from "react"

import { HttpTypes } from "@medusajs/types"
import { Input } from "@modules/design-system"
import {
  updateCustomerName,
  type CustomerProfileState,
} from "@lib/data/customer"
import { useRouter } from "next/navigation"

import AccountInfo from "../account-info"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

const ProfileName: React.FC<MyInformationProps> = ({ customer }) => {
  const router = useRouter()
  const [successState, setSuccessState] = useState(false)

  /*
   * Controlled, because React resets an uncontrolled field once a form action
   * runs (the defect K2 found on the checkout email): a rejected name came back
   * empty, so the message pointed at a field the customer could no longer see.
   */
  const [values, setValues] = useState({
    first_name: customer.first_name ?? "",
    last_name: customer.last_name ?? "",
  })

  const [state, formAction] = useActionState<
    CustomerProfileState,
    FormData
  >(updateCustomerName, null)

  const fields = state && !state.ok ? state.fields ?? {} : {}

  useEffect(() => {
    if (!state) return

    setSuccessState(state.ok)

    // Repaint the name the page reads, so the row and the fields agree after a
    // save without waiting for a full reload.
    if (state.ok) {
      router.refresh()
    }
  }, [state, router])

  const clearState = () => {
    setSuccessState(false)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target

    setValues((current) => ({ ...current, [name]: value }))
  }

  return (
    <form action={formAction} className="w-full overflow-visible">
      <AccountInfo
        label="Name"
        currentInfo={
          [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
          "Not set"
        }
        isSuccess={successState}
        isError={!!state && !state.ok}
        errorMessage={state && !state.ok ? state.message : undefined}
        clearState={clearState}
        data-testid="account-name-editor"
      >
        <div className="grid grid-cols-1 gap-4 small:grid-cols-2">
          <Input
            id="profile-first-name"
            label="First name"
            name="first_name"
            autoComplete="given-name"
            required
            value={values.first_name}
            onChange={handleChange}
            error={fields.first_name}
            data-testid="first-name-input"
          />
          <Input
            id="profile-last-name"
            label="Last name"
            name="last_name"
            autoComplete="family-name"
            required
            value={values.last_name}
            onChange={handleChange}
            error={fields.last_name}
            data-testid="last-name-input"
          />
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfileName
