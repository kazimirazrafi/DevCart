"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { ShoppingBag } from "@medusajs/icons"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Rule, buttonClass } from "@modules/design-system"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"

const cartLabel = (count: number) =>
  `Cart, ${count} item${count === 1 ? "" : "s"}`

const CartCount = ({ count }: { count: number }) => (
  <span
    className="font-mono text-small text-ink/70"
    data-testid="nav-cart-count"
    data-value={count}
  >
    {count}
  </span>
)

const CartDropdown = ({
  cart: cartState,
}: {
  cart?: HttpTypes.StoreCart | null
}) => {
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timer | undefined>(
    undefined
  )
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const totalItems =
    cartState?.items?.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0

  const subtotal = cartState?.subtotal ?? 0
  const itemRef = useRef<number>(totalItems || 0)

  const timedOpen = () => {
    open()

    const timer = setTimeout(close, 5000)

    setActiveTimer(timer)
  }

  const openAndCancel = () => {
    if (activeTimer) {
      clearTimeout(activeTimer)
    }

    open()
  }

  useEffect(() => {
    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer)
      }
    }
  }, [activeTimer])

  const pathname = usePathname()

  // Preview the cart after an item changes, except on the cart page.
  useEffect(() => {
    if (itemRef.current !== totalItems && !pathname.includes("/cart")) {
      timedOpen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems, itemRef.current])

  const items = cartState?.items
    ?.slice()
    .sort((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1))

  return (
    <>
      <LocalizedClientLink
        href="/cart"
        className="flex h-full items-center gap-x-1.5 px-1 hover:text-ink small:hidden"
        aria-label={cartLabel(totalItems)}
        data-testid="nav-cart-link"
      >
        <ShoppingBag aria-hidden="true" className="h-5 w-5" />
        <CartCount count={totalItems} />
      </LocalizedClientLink>

      <div
        className="hidden h-full z-50 small:block"
        onMouseEnter={openAndCancel}
        onMouseLeave={close}
      >
        <Popover className="relative h-full">
          <PopoverButton
            as={LocalizedClientLink}
            href="/cart"
            className="flex h-full items-center gap-x-1.5 px-1 hover:text-ink"
            aria-label={cartLabel(totalItems)}
            data-testid="nav-cart-link-desktop"
          >
            <ShoppingBag aria-hidden="true" className="h-5 w-5" />
            <CartCount count={totalItems} />
          </PopoverButton>

          <Transition
            show={cartDropdownOpen}
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <PopoverPanel
              static
              className="absolute right-0 top-[calc(100%+1px)] hidden w-[420px] border border-ink bg-stock small:block"
              data-testid="nav-cart-dropdown"
            >
              <div className="flex items-center justify-between px-4 py-3">
                <h3 className="font-display text-lead font-semibold text-ink">
                  Cart
                </h3>
                <span className="font-mono text-small text-ink/70">
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </span>
              </div>

              <Rule />

              {items?.length ? (
                <>
                  <ul className="no-scrollbar grid max-h-[402px] grid-cols-1 gap-4 overflow-y-auto p-4">
                    {items.map((item) => (
                      <li
                        className="grid grid-cols-[88px_1fr] gap-x-4"
                        key={item.id}
                        data-testid="cart-item"
                      >
                        <LocalizedClientLink
                          href={`/products/${item.product_handle}`}
                          tabIndex={-1}
                          aria-hidden="true"
                        >
                          <span className="relative block aspect-square w-full overflow-hidden border border-ink bg-ink/5">
                            {item.thumbnail ? (
                              <Image
                                src={item.thumbnail}
                                alt=""
                                fill
                                sizes="88px"
                                className="object-cover object-center"
                              />
                            ) : null}
                          </span>
                        </LocalizedClientLink>

                        <div className="flex min-w-0 flex-col justify-between gap-2">
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="flex min-w-0 flex-col">
                              <LocalizedClientLink
                                href={`/products/${item.product_handle}`}
                                className="truncate font-semibold text-ink hover:text-riso-blue"
                                data-testid="product-link"
                              >
                                {item.product_title}
                              </LocalizedClientLink>
                              <LineItemOptions
                                variant={item.variant}
                                data-testid="cart-item-variant"
                                data-value={item.variant}
                              />
                              <span
                                className="font-mono text-small text-ink/70"
                                data-testid="cart-item-quantity"
                                data-value={item.quantity}
                              >
                                {item.quantity} x
                              </span>
                            </div>
                            <LineItemPrice
                              item={item}
                              style="tight"
                              currencyCode={cartState?.currency_code ?? ""}
                            />
                          </div>

                          <DeleteButton
                            id={item.id}
                            className="text-small"
                            data-testid="cart-item-remove-button"
                          >
                            Remove
                          </DeleteButton>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <Rule />

                  <div className="flex flex-col gap-4 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-small font-semibold text-ink">
                        Subtotal
                        <span className="font-normal text-ink/70">
                          {" "}
                          (excl. taxes)
                        </span>
                      </span>
                      <span
                        className="font-mono text-body text-ink"
                        data-testid="cart-subtotal"
                        data-value={subtotal}
                      >
                        {convertToLocale({
                          amount: subtotal,
                          currency_code: cartState?.currency_code ?? "",
                        })}
                      </span>
                    </div>

                    <LocalizedClientLink
                      href="/cart"
                      className={buttonClass({
                        size: "large",
                        className: "w-full",
                      })}
                      data-testid="go-to-cart-button"
                      onClick={close}
                    >
                      Go to cart
                    </LocalizedClientLink>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 px-4 py-16">
                  <p className="text-body text-ink">Your cart is empty.</p>
                  <LocalizedClientLink
                    href="/store"
                    className={buttonClass({ size: "medium" })}
                    onClick={close}
                  >
                    Browse products
                  </LocalizedClientLink>
                </div>
              )}
            </PopoverPanel>
          </Transition>
        </Popover>
      </div>
    </>
  )
}

export default CartDropdown
