"use client"

import { HttpTypes } from "@medusajs/types"
import { Input } from "@modules/design-system"
import React from "react"

import CountrySelect from "../country-select"

export type AddressPrefix = "shipping_address" | "billing_address"

const prefixKey = (prefix: AddressPrefix) => prefix.split("_")[0]

const FIELDS: {
  field: string
  label: string
  autoComplete: string
  required: boolean
  testId: (key: string) => string
}[] = [
  {
    field: "first_name",
    label: "First name",
    autoComplete: "given-name",
    required: true,
    testId: (key) => `${key}-first-name-input`,
  },
  {
    field: "last_name",
    label: "Last name",
    autoComplete: "family-name",
    required: true,
    testId: (key) => `${key}-last-name-input`,
  },
  {
    field: "address_1",
    label: "Address",
    autoComplete: "address-line1",
    required: true,
    testId: (key) => `${key}-address-input`,
  },
  {
    field: "company",
    label: "Company (optional)",
    autoComplete: "organization",
    required: false,
    testId: (key) => `${key}-company-input`,
  },
  {
    field: "postal_code",
    label: "Postal code",
    autoComplete: "postal-code",
    required: true,
    // The two blocks have always used different postal ids.
    testId: (key) =>
      key === "shipping" ? "shipping-postal-code-input" : "billing-postal-input",
  },
  {
    field: "city",
    label: "City",
    autoComplete: "address-level2",
    required: true,
    testId: (key) => `${key}-city-input`,
  },
]

type AddressFieldsProps = {
  prefix: AddressPrefix
  values: Record<string, string>
  errors: Record<string, string>
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void
  region?: HttpTypes.StoreRegion
}

const AddressFields = ({
  prefix,
  values,
  errors,
  onChange,
  region,
}: AddressFieldsProps) => {
  const key = prefixKey(prefix)
  const value = (field: string) => values[`${prefix}.${field}`] ?? ""
  const error = (field: string) => errors[`${prefix}.${field}`]

  return (
    <div className="grid grid-cols-1 gap-4 xsmall:grid-cols-2">
      {FIELDS.map((field) => (
        <Input
          key={field.field}
          id={`${prefix}-${field.field}`}
          name={`${prefix}.${field.field}`}
          label={field.label}
          autoComplete={field.autoComplete}
          required={field.required}
          value={value(field.field)}
          onChange={onChange}
          error={error(field.field)}
          data-testid={field.testId(key)}
        />
      ))}

      <div className="flex flex-col gap-2">
        <label
          htmlFor={`${prefix}-country_code`}
          className="text-small font-semibold text-ink"
        >
          Country
        </label>
        <CountrySelect
          id={`${prefix}-country_code`}
          name={`${prefix}.country_code`}
          autoComplete="country"
          region={region}
          required
          value={value("country_code")}
          onChange={onChange}
          aria-invalid={error("country_code") ? true : undefined}
          data-testid={`${key}-country-select`}
        />
        {error("country_code") && (
          <p className="text-small text-ink">{error("country_code")}</p>
        )}
      </div>

      <Input
        id={`${prefix}-province`}
        name={`${prefix}.province`}
        label="State / Province (optional)"
        autoComplete="address-level1"
        value={value("province")}
        onChange={onChange}
        error={error("province")}
        data-testid={`${key}-province-input`}
      />

      <Input
        id={`${prefix}-phone`}
        name={`${prefix}.phone`}
        label="Phone (optional)"
        type="tel"
        autoComplete="tel"
        value={value("phone")}
        onChange={onChange}
        error={error("phone")}
        data-testid={`${key}-phone-input`}
      />
    </div>
  )
}

export default AddressFields
