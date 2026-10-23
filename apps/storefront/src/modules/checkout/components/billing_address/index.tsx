"use client"

import { HttpTypes } from "@medusajs/types"
import React, { useState } from "react"

import AddressFields from "../address-fields"

/**
 * The billing address form, shown only when it differs from the shipping one.
 * It holds its own local copy so a rejected submit keeps what was typed.
 */
const BillingAddress = ({
  cart,
  errors,
}: {
  cart: HttpTypes.StoreCart | null
  errors: Record<string, string>
}) => {
  const [formData, setFormData] = useState<Record<string, string>>({
    "billing_address.first_name": cart?.billing_address?.first_name || "",
    "billing_address.last_name": cart?.billing_address?.last_name || "",
    "billing_address.address_1": cart?.billing_address?.address_1 || "",
    "billing_address.company": cart?.billing_address?.company || "",
    "billing_address.postal_code": cart?.billing_address?.postal_code || "",
    "billing_address.city": cart?.billing_address?.city || "",
    "billing_address.country_code": cart?.billing_address?.country_code || "",
    "billing_address.province": cart?.billing_address?.province || "",
    "billing_address.phone": cart?.billing_address?.phone || "",
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <AddressFields
      prefix="billing_address"
      values={formData}
      errors={errors}
      onChange={handleChange}
      region={cart?.region}
    />
  )
}

export default BillingAddress
