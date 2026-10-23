"use client"

import { Dialog, Transition } from "@headlessui/react"
import { XMark } from "@medusajs/icons"
import React, { Fragment } from "react"

type SearchDrawerProps = {
  isOpen: boolean
  close: () => void
  children: React.ReactNode
}

const SearchDrawer = ({ isOpen, close, children }: SearchDrawerProps) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[75]" onClose={close}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-in-out duration-300"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in-out duration-200"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <Dialog.Panel
                className="pointer-events-auto w-screen max-w-md"
                data-testid="search-drawer"
              >
                <div className="flex h-full flex-col border-l border-ink/20 bg-stock shadow-2xl">
                  <div className="flex items-center justify-between border-b border-ink/20 px-4 py-3">
                    <Dialog.Title className="text-large-semi text-ink">
                      Search
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={close}
                      aria-label="Close search"
                      className="text-ink/70 hover:text-ink"
                      data-testid="close-search-drawer"
                    >
                      <XMark />
                    </button>
                  </div>
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default SearchDrawer
