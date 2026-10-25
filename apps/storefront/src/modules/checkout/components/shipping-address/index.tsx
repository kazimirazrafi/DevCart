"use client"

import { HttpTypes } from "@medusajs/types"
import { mapKeys, mapValues } from "lodash"
import React, { useEffect, useMemo, useState } from "react"

import AddressFields from "../address-fields"
import AddressSelect from "../address-select"

const EMPTY_FORM: Record<string, string> = {
  "shipping_address.first_name": "",
  "shipping_address.last_name": "",
  "shipping_address.address_1": "",
  "shipping_address.company": "",
  "shipping_address.postal_code": "",
  "shipping_address.city": "",
  "shipping_address.country_code": "",
  "shipping_address.province": "",
  "shipping_address.phone": "",
}

type AddressLike =
  | HttpTypes.StoreCartAddress
  | HttpTypes.StoreCustomerAddress

const fromAddress = (address?: AddressLike) => ({
  "shipping_address.first_name": address?.first_name || "",
  "shipping_address.last_name": address?.last_name || "",
  "shipping_address.address_1": address?.address_1 || "",
  "shipping_address.company": address?.company || "",
  "shipping_address.postal_code": address?.postal_code || "",
  "shipping_address.city": address?.city || "",
  "shipping_address.country_code": address?.country_code || "",
  "shipping_address.province": address?.province || "",
  "shipping_address.phone": address?.phone || "",
})

const ShippingAddress = ({
  customer,
  cart,
  errors,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  errors: Record<string, string>
}) => {
  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  const addressesInRegion = useMemo(
    () =>
      (customer?.addresses ?? []).filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ),
    [customer?.addresses, countriesInRegion]
  )

  const savedAddress = useMemo(
    () =>
      addressesInRegion.find((a) => a.is_default_shipping) ?? addressesInRegion[0],
    [addressesInRegion]
  )

  const [formData, setFormData] = useState<Record<string, string>>(() => ({
    ...EMPTY_FORM,
    ...fromAddress(cart?.shipping_address || savedAddress),
  }))

  const setFormAddress = (address?: AddressLike) => {
    if (!address) {
      return
    }

    setFormData((prevState) => ({ ...prevState, ...fromAddress(address) }))
  }

  useEffect(() => {
    // Only overwrite a prefill that has been submitted as a cart address.
    if (cart?.shipping_address?.address_1) {
      setFormAddress(cart.shipping_address)
    }
  }, [cart])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }))
  }

  // Empty values are passed as null so the picker can match a saved address.
  const addressInput = useMemo(
    () =>
      mapValues(
        mapKeys(formData, (_, key) =>
          key.replace("shipping_address.", "")
        ),
        (value) => value || null
      ) as unknown as HttpTypes.StoreCartAddress,
    [formData]
  )

  return (
    <div className="flex flex-col gap-6">
      {customer && addressesInRegion.length > 0 && (
        <div className="flex flex-col gap-3 border border-ink p-5">
          <p className="text-small">
            {`Hi ${customer.first_name}, use one of your saved addresses?`}
          </p>
          <AddressSelect
            addresses={addressesInRegion}
            addressInput={addressInput}
            onSelect={setFormAddress}
          />
        </div>
      )}

      <AddressFields
        prefix="shipping_address"
        values={formData}
        errors={errors}
        onChange={handleChange}
        region={cart?.region}
      />
    </div>
  )
}

export default ShippingAddress
