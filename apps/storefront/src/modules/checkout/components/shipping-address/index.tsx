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

/*
 * The cart's address and a saved customer address are different types — the
 * saved one allows null for fields the cart type marks optional — but every
 * field is read the same way, so both are accepted and null becomes empty.
 */
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

/**
 * The shipping address form. It holds what has been typed locally so a rejected
 * submit never clears the fields, and seeds itself in this order: what the cart
 * already holds, then the signed-in customer's saved address, then empty.
 *
 * The email is not here: it belongs to the contact step.
 */
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

  // Saved addresses are only usable in the region being shopped.
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
    // Only a cart with an address on it overwrites the form: a later cart
    // update must not clear a prefill the customer has not submitted yet.
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

  /*
   * What the picker compares itself against. An input the customer left alone
   * is `""` where a saved address that never had that field is `null`, so the
   * empty ones are handed over as null: without that, prefilling from a saved
   * address reads back as "Choose an address" even though the form is filled.
   */
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
          {/*
           * Only the addresses the region can ship to: an address from another
           * region is one the server rejects, so offering it is a dead end.
           */}
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
