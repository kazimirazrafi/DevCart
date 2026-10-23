"use client"

import clsx from "clsx"
import { isEqual } from "lodash"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/design-system"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import WishlistButton from "@modules/products/components/wishlist-button"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

/** Below this many units, the buy box says how many are left. */
const LOW_STOCK_THRESHOLD = 5

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt) => {
    if (varopt.option_id) acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant])

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If the variant is the one being shown, it is buyable when either we do
    // not track its inventory, it may be back-ordered, or units are left.
    if (!selectedVariant) {
      return false
    }

    if (!selectedVariant.manage_inventory || selectedVariant.allow_backorder) {
      return true
    }

    return (selectedVariant.inventory_quantity ?? 0) > 0
  }, [selectedVariant])

  /*
   * What to tell the customer about availability. Untracked and back-ordered
   * variants are simply available; a tracked variant either says how many are
   * left or that it is gone, using the same threshold the seed's low-stock
   * sizes fall under.
   */
  const stockLabel = useMemo(() => {
    if (!selectedVariant) {
      return null
    }

    if (!selectedVariant.manage_inventory || selectedVariant.allow_backorder) {
      return { text: "In stock", low: false }
    }

    const quantity = selectedVariant.inventory_quantity ?? 0

    if (quantity <= 0) {
      return { text: "Out of stock", low: false }
    }

    if (quantity <= LOW_STOCK_THRESHOLD) {
      return { text: `Only ${quantity} left`, low: true }
    }

    return { text: "In stock", low: false }
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)
    setError(null)

    try {
      // The mutation reports its own failures rather than throwing: a thrown
      // server-action error is masked to generic copy in production.
      const result = await addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
        countryCode,
      })

      if (!result.ok) {
        console.error(
          `Failed to add variant ${selectedVariant.id} to the cart: ${result.message}`
        )
        // The buy box has to say something, so a click that changes nothing is
        // not silent.
        setError(result.message)
      } else {
        // Refresh the route so the cart count in the nav and the cart drawer
        // pick the new line up from the server rather than from the previous
        // render of this (statically prerendered) page.
        router.refresh()
      }
    } catch (cause) {
      console.error(
        `Failed to add variant ${selectedVariant.id} to the cart`,
        cause
      )
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Could not add this to the cart. Try again."
      )
    } finally {
      setIsAdding(false)
    }
  }

  const hasOptions = (product.variants?.length ?? 0) > 1

  return (
    <div className="flex flex-col gap-6" ref={actionsRef}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <ProductPrice product={product} variant={selectedVariant} />
        {stockLabel && (
          <p
            className={clsx(
              "text-small font-semibold",
              stockLabel.low || stockLabel.text === "In stock"
                ? "text-riso-green"
                : "text-ink"
            )}
            data-testid="stock-state"
          >
            {stockLabel.text}
          </p>
        )}
      </div>

      {hasOptions && (
        <div className="flex flex-col gap-4">
          {(product.options || []).map((option) => (
            <OptionSelect
              key={option.id}
              option={option}
              current={options[option.id]}
              updateOption={setOptionValue}
              title={option.title ?? ""}
              data-testid="product-options"
              disabled={!!disabled || isAdding}
            />
          ))}
        </div>
      )}

      <div className="flex items-stretch gap-3">
        <Button
          onClick={handleAddToCart}
          disabled={
            !inStock || !selectedVariant || !!disabled || isAdding || !isValidVariant
          }
          size="large"
          className="flex-1"
          loading={isAdding}
          data-testid="add-product-button"
        >
          {!selectedVariant
            ? "Select variant"
            : !inStock || !isValidVariant
              ? "Out of stock"
              : "Add to cart"}
        </Button>

        {/*
         * The saved variant is the one the customer picked, so opening the
         * wishlist later can put the same choice back on the page. The heart
         * works without a variant too — the product is what is saved.
         */}
        <WishlistButton
          productId={product.id}
          variantId={selectedVariant?.id ?? null}
          size="large"
          withLabel
        />
      </div>

      {error && (
        <p role="alert" className="text-small text-ink" data-testid="cart-error">
          {error}
        </p>
      )}

      <MobileActions
        product={product}
        variant={selectedVariant}
        options={options}
        updateOptions={setOptionValue}
        inStock={inStock}
        handleAddToCart={handleAddToCart}
        isAdding={isAdding}
        show={!inView}
        optionsDisabled={!!disabled || isAdding}
      />
    </div>
  )
}
