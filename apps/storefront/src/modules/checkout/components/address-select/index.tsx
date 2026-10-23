"use client"

import { Listbox, Transition } from "@headlessui/react"
import { ChevronUpDown } from "@medusajs/icons"
import compareAddresses from "@lib/util/compare-addresses"
import { HttpTypes } from "@medusajs/types"
import clsx from "clsx"
import { Fragment, useMemo } from "react"

type AddressSelectProps = {
  addresses: HttpTypes.StoreCustomerAddress[]
  addressInput: HttpTypes.StoreCartAddress | null
  onSelect: (address: HttpTypes.StoreCartAddress | undefined) => void
}

const AddressSelect = ({
  addresses,
  addressInput,
  onSelect,
}: AddressSelectProps) => {
  const handleSelect = (id: string) => {
    const savedAddress = addresses.find((a) => a.id === id)
    if (savedAddress) {
      onSelect(savedAddress as HttpTypes.StoreCartAddress)
    }
  }

  const selectedAddress = useMemo(() => {
    return addresses.find(
      (a) => addressInput && compareAddresses(a, addressInput)
    )
  }, [addresses, addressInput])

  return (
    <Listbox onChange={handleSelect} value={selectedAddress?.id}>
      <div className="relative">
        <Listbox.Button
          className="relative flex w-full items-center justify-between gap-2 border border-ink bg-stock px-4 py-3 text-left text-small text-ink"
          data-testid="shipping-address-select"
        >
          {({ open }) => (
            <>
              <span className="block truncate">
                {selectedAddress
                  ? selectedAddress.address_1
                  : "Choose an address"}
              </span>
              <ChevronUpDown
                className={clsx("transition-transform duration-200", {
                  "rotate-180": open,
                })}
              />
            </>
          )}
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options
            className="absolute z-20 max-h-60 w-full overflow-auto border border-ink bg-stock text-small focus:outline-none"
            data-testid="shipping-address-options"
          >
            {addresses.map((address) => {
              const isSelected = selectedAddress?.id === address.id

              return (
                <Listbox.Option
                  key={address.id}
                  value={address.id}
                  className="relative cursor-pointer select-none py-4 pl-5 pr-4 hover:bg-ink/5"
                  data-testid="shipping-address-option"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      data-testid="shipping-address-radio"
                      data-state={isSelected ? "checked" : "unchecked"}
                      className={clsx(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        isSelected ? "border-ink" : "border-ink/40"
                      )}
                    >
                      {isSelected && (
                        <span className="h-2.5 w-2.5 rounded-full bg-riso-blue" />
                      )}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-semibold text-ink">
                        {address.first_name} {address.last_name}
                      </span>
                      {address.company && (
                        <span className="text-ink/80">{address.company}</span>
                      )}
                      <span className="mt-1 flex flex-col text-ink/80">
                        <span>
                          {address.address_1}
                          {address.address_2 && `, ${address.address_2}`}
                        </span>
                        <span>
                          {address.postal_code}, {address.city}
                        </span>
                        <span>
                          {address.province && `${address.province}, `}
                          {address.country_code?.toUpperCase()}
                        </span>
                      </span>
                    </div>
                  </div>
                </Listbox.Option>
              )
            })}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  )
}

export default AddressSelect
