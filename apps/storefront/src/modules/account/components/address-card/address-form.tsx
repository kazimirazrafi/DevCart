"use client"

import { HttpTypes } from "@medusajs/types"
import CountrySelect from "@modules/checkout/components/country-select"
import { Input } from "@modules/design-system"
import React from "react"

import type { AddressFormValues } from "@lib/data/customer"

export type { AddressFormValues }

export const emptyAddressForm = (): AddressFormValues => ({
  first_name: "",
  last_name: "",
  company: "",
  address_1: "",
  address_2: "",
  city: "",
  postal_code: "",
  province: "",
  country_code: "",
  phone: "",
})

export const addressFormValues = (
  address?: HttpTypes.StoreCustomerAddress | null
): AddressFormValues => ({
  first_name: address?.first_name ?? "",
  last_name: address?.last_name ?? "",
  company: address?.company ?? "",
  address_1: address?.address_1 ?? "",
  address_2: address?.address_2 ?? "",
  city: address?.city ?? "",
  postal_code: address?.postal_code ?? "",
  province: address?.province ?? "",
  country_code: address?.country_code ?? "",
  phone: address?.phone ?? "",
})

const FIELDS: {
  field: keyof AddressFormValues
  label: string
  autoComplete: string
  required: boolean
  testId: string
  type?: string
}[] = [
  {
    field: "first_name",
    label: "First name",
    autoComplete: "given-name",
    required: true,
    testId: "first-name-input",
  },
  {
    field: "last_name",
    label: "Last name",
    autoComplete: "family-name",
    required: true,
    testId: "last-name-input",
  },
  {
    field: "company",
    label: "Company (optional)",
    autoComplete: "organization",
    required: false,
    testId: "company-input",
  },
  {
    field: "address_1",
    label: "Address",
    autoComplete: "address-line1",
    required: true,
    testId: "address-1-input",
  },
  {
    field: "address_2",
    label: "Apartment, suite, etc. (optional)",
    autoComplete: "address-line2",
    required: false,
    testId: "address-2-input",
  },
  {
    field: "postal_code",
    label: "Postal code",
    autoComplete: "postal-code",
    required: true,
    testId: "postal-code-input",
  },
  {
    field: "city",
    label: "City",
    autoComplete: "address-level2",
    required: true,
    testId: "city-input",
  },
  {
    field: "province",
    label: "State / Province (optional)",
    autoComplete: "address-level1",
    required: false,
    testId: "state-input",
  },
]

type AddressFormProps = {
  /** Keeps add and edit fields from sharing ids when both dialogs exist. */
  idPrefix: "add" | "edit"
  values: AddressFormValues
  errors: Record<string, string>
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void
  region: HttpTypes.StoreRegion
}

/**
 * The address inputs. Values are held by the caller so a rejected submit keeps
 * what was typed: React resets an uncontrolled field once a form action runs.
 * Fields are a single column so the modal stays readable on a phone.
 */
const AddressForm = ({
  idPrefix,
  values,
  errors,
  onChange,
  region,
}: AddressFormProps) => {
  return (
    <div className="flex w-full flex-col gap-4">
      {FIELDS.map((field) => (
        <Input
          key={field.field}
          id={`${idPrefix}-address-${field.field}`}
          name={field.field}
          label={field.label}
          type={field.type}
          autoComplete={field.autoComplete}
          required={field.required}
          value={values[field.field]}
          onChange={onChange}
          error={errors[field.field]}
          data-testid={field.testId}
        />
      ))}

      <div className="flex flex-col gap-2">
        <label
          htmlFor={`${idPrefix}-address-country_code`}
          className="text-small font-semibold text-ink"
        >
          Country
        </label>
        <CountrySelect
          id={`${idPrefix}-address-country_code`}
          name="country_code"
          autoComplete="country"
          region={region}
          required
          value={values.country_code}
          onChange={onChange}
          aria-invalid={errors.country_code ? true : undefined}
          data-testid="country-select"
        />
        {errors.country_code && (
          <p className="text-small text-ink">{errors.country_code}</p>
        )}
      </div>

      <Input
        id={`${idPrefix}-address-phone`}
        name="phone"
        label="Phone (optional)"
        type="tel"
        autoComplete="tel"
        value={values.phone}
        onChange={onChange}
        error={errors.phone}
        data-testid="phone-input"
      />
    </div>
  )
}

export default AddressForm
