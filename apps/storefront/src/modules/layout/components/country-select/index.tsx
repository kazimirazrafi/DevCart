"use client"

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react"
import { useEffect, useMemo, useState } from "react"
import ReactCountryFlag from "react-country-flag"

import { useParams, usePathname } from "next/navigation"
import { updateRegion } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"

type CountryOption = {
  country: string
  region: string
  label: string
}

type CountrySelectProps = {
  regions: HttpTypes.StoreRegion[]
}

const CountrySelect = ({ regions }: CountrySelectProps) => {
  const { countryCode } = useParams()
  const currentPath = usePathname().split(`/${countryCode}`)[1]

  const options = useMemo(() => {
    return regions
      ?.map((r) => {
        return r.countries?.map((c) => ({
          country: c.iso_2 ?? "",
          region: r.id,
          label: c.display_name ?? "",
        }))
      })
      .flat()
      .filter((o): o is CountryOption => !!o)
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [regions])

  // Seeded from the URL so the Listbox is never uncontrolled on first render.
  const [current, setCurrent] = useState<CountryOption | undefined>(() =>
    options?.find((o) => o.country === countryCode)
  )

  useEffect(() => {
    if (countryCode) {
      const option = options?.find((o) => o?.country === countryCode)
      setCurrent(option)
    }
  }, [options, countryCode])

  const handleChange = (option: CountryOption) => {
    updateRegion(option.country, currentPath)
  }

  return (
    <div>
      <Listbox as="div" value={current} onChange={handleChange}>
        <ListboxButton
          className="py-1 w-full"
          aria-label={
            current
              ? `Shipping to ${current.label}. Change country`
              : "Choose a shipping country"
          }
        >
          <div className="txt-compact-small flex items-start gap-x-2">
            <span>Shipping to:</span>
            {current && (
              <span className="txt-compact-small flex items-center gap-x-2">
                <ReactCountryFlag
                  svg
                  aria-hidden="true"
                  style={{
                    width: "16px",
                    height: "16px",
                  }}
                  countryCode={current.country ?? ""}
                />
                {current.label}
              </span>
            )}
          </div>
        </ListboxButton>
        <div className="flex relative w-full min-w-[320px]">
          <ListboxOptions
            transition
            className="absolute -bottom-[calc(100%-36px)] left-0 xsmall:left-auto xsmall:right-0 max-h-[442px] overflow-y-scroll z-[900] bg-stock drop-shadow-md text-small-regular uppercase text-ink border border-ink/20 no-scrollbar rounded-rounded w-full transition duration-150 ease-out data-[closed]:opacity-0 motion-reduce:transition-none"
          >
            {options?.map((o, index) => {
              return (
                <ListboxOption
                  key={index}
                  value={o}
                  className="py-2 hover:bg-ink/5 px-3 cursor-pointer flex items-center gap-x-2 data-[focus]:bg-ink/5"
                >
                  <ReactCountryFlag
                    svg
                    aria-hidden="true"
                    style={{
                      width: "16px",
                      height: "16px",
                    }}
                    countryCode={o?.country ?? ""}
                  />
                  {" "}
                  {o?.label}
                </ListboxOption>
              )
            })}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  )
}

export default CountrySelect
