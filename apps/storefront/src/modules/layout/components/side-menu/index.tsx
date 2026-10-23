"use client"

import { Popover, PopoverPanel, Transition } from "@headlessui/react"
import { ArrowRightMini, BarsThree, XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"
import { Fragment } from "react"
import { NAV_LINKS } from "../../lib/nav-links"
import CountrySelect from "../country-select"
import LanguageSelect from "../language-select"
import ThemeSwitcher from "../theme-switcher"
import { Locale } from "@lib/data/locales"
import { getStoreName } from "@lib/util/env"

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
}

const SideMenu = ({ regions, locales, currentLocale }: SideMenuProps) => {
  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full">
                {/*
                 * An icon rather than the word: the header's controls are
                 * read at a glance, and the name is carried for assistive
                 * technology instead of being drawn.
                 */}
                <Popover.Button
                  data-testid="nav-menu-button"
                  aria-label="Open menu"
                  className="relative h-full flex items-center px-1.5 transition-all ease-out duration-200 focus:outline-none hover:text-ink"
                >
                  <BarsThree aria-hidden="true" className="h-5 w-5" />
                </Popover.Button>
              </div>

              {open && (
                <div
                  className="fixed inset-0 z-[50] bg-transparent pointer-events-auto"
                  onClick={close}
                  data-testid="side-menu-backdrop"
                />
              )}

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-150"
                enterFrom="opacity-0"
                enterTo="opacity-100 backdrop-blur-2xl"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 backdrop-blur-2xl"
                leaveTo="opacity-0"
              >
                <PopoverPanel className="flex flex-col absolute w-full pr-4 sm:pr-0 sm:w-1/3 2xl:w-1/4 sm:min-w-min h-[calc(100vh-1rem)] z-[51] inset-x-0 text-sm text-stock m-2 backdrop-blur-2xl">
                  <div
                    data-testid="nav-menu-popup"
                    className="flex flex-col h-full bg-ink/90 rounded-rounded justify-between p-6"
                  >
                    <div className="flex justify-end" id="xmark">
                      <button
                        type="button"
                        data-testid="close-menu-button"
                        onClick={close}
                        /* The icon carries no text, so the button needs its own name. */
                        aria-label="Close menu"
                      >
                        <XMark aria-hidden="true" />
                      </button>
                    </div>
                    <ul className="flex flex-col gap-6 items-start justify-start">
                      {NAV_LINKS.map((link) => {
                        return (
                          <li key={link.label}>
                            <LocalizedClientLink
                              href={link.href}
                              className="text-3xl leading-10 hover:text-stock/60"
                              onClick={close}
                              data-testid={`${link.label.toLowerCase()}-link`}
                            >
                              {link.label}
                            </LocalizedClientLink>
                          </li>
                        )
                      })}
                    </ul>
                    <div className="flex flex-col gap-y-6">
                      {/*
                       * The panel carries every destination, including the
                       * ones the header already shows, and the colour control
                       * with them — so the navigation has one home on a phone
                       * and two on a wide screen, never a missing one.
                       */}
                      <ThemeSwitcher
                        variant="full"
                        tone="on-ink"
                        testIdPrefix="theme"
                      />
                      {!!locales?.length && (
                        <div className="flex justify-between">
                          <LanguageSelect
                            locales={locales}
                            currentLocale={currentLocale}
                          />
                          <ArrowRightMini aria-hidden="true" />
                        </div>
                      )}
                      <div className="flex justify-between">
                        {regions && <CountrySelect regions={regions} />}
                        <ArrowRightMini aria-hidden="true" />
                      </div>
                      <Text className="flex justify-between txt-compact-small">
                        © {new Date().getFullYear()} {getStoreName()}. All rights
                        reserved.
                      </Text>
                    </div>
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
