"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { updateLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
  availableUnits?: number | null
}

// A picker with hundreds of entries is not a quantity control.
const MAX_LINE_QUANTITY = 10

const Item = ({
  item,
  type = "full",
  currencyCode,
  availableUnits,
}: ItemProps) => {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [pendingQuantity, setPendingQuantity] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // A confirmed change returns a new quantity and clears the optimistic value.
  useEffect(() => {
    setPendingQuantity(null)
  }, [item.quantity])

  const quantity = pendingQuantity ?? item.quantity

  const stockKnown = typeof availableUnits === "number"
  const available = stockKnown ? (availableUnits as number) : null
  const maxQuantity =
    available === null ? MAX_LINE_QUANTITY : Math.max(Math.min(available, MAX_LINE_QUANTITY), 1)
  const outOfStock = available !== null && available < 1
  const exceedsStock = available !== null && item.quantity > available

  const changeQuantity = async (nextQuantity: number) => {
    // The API reads quantity 0 as "delete this line".
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      return
    }

    if (nextQuantity === item.quantity) {
      return
    }

    setError(null)
    setPendingQuantity(nextQuantity)
    setUpdating(true)

    try {
      const result = await updateLineItem({
        lineId: item.id,
        quantity: nextQuantity,
      })

      if (!result.ok) {
        setError(result.message)
        setPendingQuantity(null)
      } else {
        router.refresh()
      }
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Could not update the quantity. Try again."
      )
      setPendingQuantity(null)
    } finally {
      setUpdating(false)
    }
  }

  const selectId = `quantity-${item.id}`
  const quantityOptions = Array.from(
    { length: maxQuantity },
    (_unused, index) => index + 1
  )

  return (
    <li
      className="flex gap-4 border-b border-ink/20 py-6"
      aria-busy={updating || undefined}
      data-testid="product-row"
    >
      <LocalizedClientLink
        href={`/products/${item.product_handle}`}
        className="block w-20 shrink-0 small:w-24"
        tabIndex={-1}
        aria-hidden="true"
      >
        <span className="relative block aspect-square w-full overflow-hidden border border-ink bg-ink/5">
          {item.thumbnail ? (
            <Image
              src={item.thumbnail}
              alt=""
              fill
              sizes="96px"
              className="object-cover object-center"
            />
          ) : null}
        </span>
      </LocalizedClientLink>

      <div className="flex min-w-0 flex-1 flex-col gap-4 small:flex-row small:justify-between small:gap-6">
        <div className="flex min-w-0 flex-col gap-1">
          <LocalizedClientLink
            href={`/products/${item.product_handle}`}
            className="font-display text-lead font-semibold leading-tight text-ink hover:text-riso-blue"
            data-testid="product-title"
          >
            {item.product_title}
          </LocalizedClientLink>

          <LineItemOptions variant={item.variant} data-testid="product-variant" />

          {type === "full" ? (
            <LineItemUnitPrice
              item={item}
              style="tight"
              currencyCode={currencyCode}
            />
          ) : null}

          {outOfStock || exceedsStock ? (
            <p
              role="status"
              className="text-small font-semibold text-ink"
              data-testid="stock-warning"
            >
              {outOfStock
                ? "Out of stock. Remove this line to continue."
                : `Only ${available} left. Lower the quantity to continue.`}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 small:items-end">
          {type === "full" ? (
            <div className="flex items-center gap-2">
              <label htmlFor={selectId} className="text-small text-ink/70">
                Quantity
              </label>
              <CartItemSelect
                id={selectId}
                value={quantity}
                disabled={updating || outOfStock}
                onChange={(event) => changeQuantity(Number(event.target.value))}
                data-testid="product-select-button"
              >
                {exceedsStock ? (
                  <option value={item.quantity}>
                    {item.quantity} (only {available} left)
                  </option>
                ) : null}
                {quantityOptions.map((option) => (
                  <option value={option} key={option}>
                    {option}
                  </option>
                ))}
              </CartItemSelect>
              {updating ? <Spinner /> : null}
            </div>
          ) : (
            <p
              className="font-mono text-small text-ink/70"
              data-testid="cart-item-quantity"
            >
              {item.quantity} x
            </p>
          )}

          <LineItemPrice item={item} style="tight" currencyCode={currencyCode} />
          {type === "full" ? (
            <DeleteButton
              id={item.id}
              className="text-small"
              data-testid="product-delete-button"
            >
              Remove
            </DeleteButton>
          ) : null}

          <ErrorMessage error={error} data-testid="product-error-message" />
        </div>
      </div>
    </li>
  )
}

export default Item
