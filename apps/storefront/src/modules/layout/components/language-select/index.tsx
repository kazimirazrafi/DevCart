"use client"

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react"
import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import ReactCountryFlag from "react-country-flag"

import { updateLocale } from "@lib/data/locale-actions"
import { Locale } from "@lib/data/locales"

type LanguageOption = {
  code: string
  name: string
  localizedName: string
  countryCode: string
}

const getCountryCodeFromLocale = (localeCode: string): string => {
  try {
    const locale = new Intl.Locale(localeCode)
    if (locale.region) {
      return locale.region.toUpperCase()
    }
    const maximized = locale.maximize()
    return maximized.region?.toUpperCase() ?? localeCode.toUpperCase()
  } catch {
    const parts = localeCode.split(/[-_]/)
    return parts.length > 1 ? parts[1].toUpperCase() : parts[0].toUpperCase()
  }
}

type LanguageSelectProps = {
  locales: Locale[]
  currentLocale: string | null
}

/**
 * Gets the localized display name for a language code using Intl API.
 * Falls back to the provided name if Intl is unavailable.
 */
const getLocalizedLanguageName = (
  code: string,
  fallbackName: string,
  displayLocale: string = "en-US"
): string => {
  try {
    const displayNames = new Intl.DisplayNames([displayLocale], {
      type: "language",
    })
    return displayNames.of(code) ?? fallbackName
  } catch {
    return fallbackName
  }
}

const DEFAULT_OPTION: LanguageOption = {
  code: "",
  name: "Default",
  localizedName: "Default",
  countryCode: "",
}

/*
 * Like the country switcher, the Listbox owns the open state so the control is
 * operable from the keyboard; the previous version opened only on hover.
 */
const LanguageSelect = ({ locales, currentLocale }: LanguageSelectProps) => {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const options = useMemo(() => {
    const localeOptions = locales.map((locale) => ({
      code: locale.code,
      name: locale.name,
      localizedName: getLocalizedLanguageName(
        locale.code,
        locale.name,
        currentLocale ?? "en-US"
      ),
      countryCode: getCountryCodeFromLocale(locale.code),
    }))
    return [DEFAULT_OPTION, ...localeOptions]
  }, [locales, currentLocale])

  // Seeded rather than left undefined, so the Listbox never switches from
  // uncontrolled to controlled on its first render.
  const [current, setCurrent] = useState<LanguageOption | undefined>(() => {
    if (!currentLocale) return DEFAULT_OPTION

    return (
      options.find(
        (o) => o.code.toLowerCase() === currentLocale.toLowerCase()
      ) ?? DEFAULT_OPTION
    )
  })

  useEffect(() => {
    if (currentLocale) {
      const option = options.find(
        (o) => o.code.toLowerCase() === currentLocale.toLowerCase()
      )
      setCurrent(option ?? DEFAULT_OPTION)
    } else {
      setCurrent(DEFAULT_OPTION)
    }
  }, [options, currentLocale])

  const handleChange = (option: LanguageOption) => {
    startTransition(async () => {
      await updateLocale(option.code)
      router.refresh()
    })
  }

  return (
    <div>
      <Listbox
        as="div"
        value={current ?? DEFAULT_OPTION}
        onChange={handleChange}
        disabled={isPending}
      >
        <ListboxButton
          className="py-1 w-full"
          aria-label={
            current
              ? `Language ${current.localizedName}. Change language`
              : "Choose a language"
          }
        >
          <div className="txt-compact-small flex items-start gap-x-2">
            <span>Language:</span>
            {current && (
              <span className="txt-compact-small flex items-center gap-x-2">
                {current.countryCode && (
                  <ReactCountryFlag
                    svg
                    aria-hidden="true"
                    style={{
                      width: "16px",
                      height: "16px",
                    }}
                    countryCode={current.countryCode}
                  />
                )}
                {isPending ? "..." : current.localizedName}
              </span>
            )}
          </div>
        </ListboxButton>
        <div className="flex relative w-full min-w-[320px]">
          <ListboxOptions
            transition
            className="absolute -bottom-[calc(100%-36px)] left-0 xsmall:left-auto xsmall:right-0 max-h-[442px] overflow-y-scroll z-[900] bg-stock drop-shadow-md text-small-regular uppercase text-ink border border-ink/20 no-scrollbar rounded-rounded w-full transition duration-150 ease-out data-[closed]:opacity-0 motion-reduce:transition-none"
          >
            {options.map((o) => (
              <ListboxOption
                key={o.code || "default"}
                value={o}
                className="py-2 hover:bg-ink/5 px-3 cursor-pointer flex items-center gap-x-2 data-[focus]:bg-ink/5"
              >
                {o.countryCode ? (
                  <ReactCountryFlag
                    svg
                    aria-hidden="true"
                    style={{
                      width: "16px",
                      height: "16px",
                    }}
                    countryCode={o.countryCode}
                  />
                ) : (
                  <span aria-hidden="true" style={{ width: "16px", height: "16px" }} />
                )}
                {o.localizedName}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </div>
      </Listbox>
    </div>
  )
}

export default LanguageSelect
