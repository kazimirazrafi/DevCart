"use client"

import { Radio, RadioGroup } from "@headlessui/react"
import { setShippingMethod } from "@lib/data/cart"
import { calculatePriceForShippingOption } from "@lib/data/fulfillment"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import clsx from "clsx"
import ErrorMessage from "@modules/checkout/components/error-message"
import { Button, linkClass } from "@modules/design-system"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import StepSection from "../step-section"

const PICKUP_OPTION_ON = "__PICKUP_ON"
const PICKUP_OPTION_OFF = "__PICKUP_OFF"

type ServiceZone = {
  service_zone?: {
    fulfillment_set?: {
      type?: string
      location?: { address: HttpTypes.StoreCartAddress }
    }
  }
}

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
  isOpen: boolean
}

function formatAddress(address?: HttpTypes.StoreCartAddress) {
  if (!address) {
    return ""
  }

  let ret = ""

  if (address.address_1) {
    ret += ` ${address.address_1}`
  }

  if (address.address_2) {
    ret += `, ${address.address_2}`
  }

  if (address.postal_code) {
    ret += `, ${address.postal_code} ${address.city}`
  }

  if (address.country_code) {
    ret += `, ${address.country_code.toUpperCase()}`
  }

  return ret
}

const RadioMark = ({ checked }: { checked: boolean }) => (
  <span
    aria-hidden="true"
    className={clsx(
      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
      checked ? "border-ink" : "border-ink/40"
    )}
  >
    {checked && <span className="h-2.5 w-2.5 rounded-full bg-riso-blue" />}
  </span>
)

const optionClass = (selected: boolean, disabled?: boolean) =>
  clsx(
    "flex w-full items-center justify-between gap-4 border px-5 py-4 text-small",
    selected ? "border-ink" : "border-ink/30",
    disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-ink"
  )

const Shipping = ({ cart, availableShippingMethods, isOpen }: ShippingProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)
  const [showPickupOptions, setShowPickupOptions] =
    useState<string>(PICKUP_OPTION_OFF)
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<
    Record<string, number>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  )

  const router = useRouter()
  const pathname = usePathname()

  const fulfillmentType = (option: HttpTypes.StoreCartShippingOption) =>
    (option as unknown as ServiceZone).service_zone?.fulfillment_set?.type

  const _shippingMethods = useMemo(
    () => availableShippingMethods?.filter((sm) => fulfillmentType(sm) !== "pickup"),
    [availableShippingMethods]
  )

  const _pickupMethods = useMemo(
    () => availableShippingMethods?.filter((sm) => fulfillmentType(sm) === "pickup"),
    [availableShippingMethods]
  )

  const hasPickupOptions = !!_pickupMethods?.length

  useEffect(() => {
    setIsLoadingPrices(true)

    const promises = (_shippingMethods ?? [])
      .filter((sm) => sm.price_type === "calculated")
      .map((sm) => calculatePriceForShippingOption(sm.id, cart.id))

    if (!promises.length) {
      setCalculatedPricesMap({})
      setIsLoadingPrices(false)
      return
    }

    let cancelled = false

    Promise.allSettled(promises).then((res) => {
      if (cancelled) {
        return
      }

      const pricesMap: Record<string, number> = {}
      res
        .filter((r) => r.status === "fulfilled")
        .forEach((p) => {
          if (p.value?.id) {
            pricesMap[p.value.id] = p.value.amount ?? 0
          }
        })

      setCalculatedPricesMap(pricesMap)
      setIsLoadingPrices(false)
    })

    return () => {
      cancelled = true
    }
  }, [_shippingMethods, cart.id])

  useEffect(() => {
    if (_pickupMethods?.find((m) => m.id === shippingMethodId)) {
      setShowPickupOptions(PICKUP_OPTION_ON)
    }
  }, [_pickupMethods, shippingMethodId])

  const handleSubmit = () => {
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const handleSetShippingMethod = async (
    id: string,
    variant: "shipping" | "pickup"
  ) => {
    setError(null)
    setShowPickupOptions(
      variant === "pickup" ? PICKUP_OPTION_ON : PICKUP_OPTION_OFF
    )

    const previousId = shippingMethodId
    setIsLoading(true)
    setShippingMethodId(id)

    const result = await setShippingMethod({
      cartId: cart.id,
      shippingMethodId: id,
    })

    if (!result.ok) {
      setShippingMethodId(previousId)
      setError(result.message)
    }

    setIsLoading(false)
  }

  const priceOf = (option: HttpTypes.StoreCartShippingOption) => {
    if (option.price_type === "flat") {
      return convertToLocale({
        amount: option.amount ?? 0,
        currency_code: cart.currency_code,
      })
    }

    const calculated = calculatedPricesMap[option.id]

    return typeof calculated === "number"
      ? convertToLocale({
          amount: calculated,
          currency_code: cart.currency_code,
        })
      : isLoadingPrices
        ? "…"
        : "-"
  }

  const selected = cart.shipping_methods?.at(-1)

  return (
    <StepSection
      id="delivery"
      number={3}
      title="Delivery"
      isOpen={isOpen}
      complete={(cart.shipping_methods?.length ?? 0) > 0}
    >
      {isOpen ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-small font-semibold text-ink">
              Shipping method
            </h3>

            {hasPickupOptions && (
              <RadioGroup
                value={showPickupOptions}
                onChange={() => {
                  const id = _pickupMethods.find(
                    (option) => !option.insufficient_inventory
                  )?.id

                  if (id) {
                    handleSetShippingMethod(id, "pickup")
                  }
                }}
                aria-label="Pick up or have it delivered"
              >
                <Radio
                  value={PICKUP_OPTION_ON}
                  data-testid="delivery-option-radio"
                  className={optionClass(
                    showPickupOptions === PICKUP_OPTION_ON
                  )}
                >
                  <span className="flex items-center gap-3">
                    <RadioMark
                      checked={showPickupOptions === PICKUP_OPTION_ON}
                    />
                    Pick up your order
                  </span>
                  <span>-</span>
                </Radio>
              </RadioGroup>
            )}

            <RadioGroup
              value={shippingMethodId}
              onChange={(value) => {
                if (value) {
                  return handleSetShippingMethod(value, "shipping")
                }
              }}
              aria-label="Shipping method"
              data-testid="delivery-options-container"
            >
              {_shippingMethods?.map((option) => {
                const isDisabled =
                  option.price_type === "calculated" &&
                  !isLoadingPrices &&
                  typeof calculatedPricesMap[option.id] !== "number"

                return (
                  <Radio
                    key={option.id}
                    value={option.id}
                    data-testid="delivery-option-radio"
                    disabled={isDisabled}
                    className={optionClass(option.id === shippingMethodId, isDisabled)}
                  >
                    <span className="flex items-center gap-3">
                      <RadioMark checked={option.id === shippingMethodId} />
                      {option.name}
                    </span>
                    <span className="font-mono">{priceOf(option)}</span>
                  </Radio>
                )
              })}
            </RadioGroup>
          </div>

          {showPickupOptions === PICKUP_OPTION_ON && (
            <div className="flex flex-col gap-3">
              <h3 className="text-small font-semibold text-ink">Store</h3>
              <p className="text-small text-ink/75">Choose a store near you</p>

              <RadioGroup
                value={shippingMethodId}
                onChange={(value) => {
                  if (value) {
                    return handleSetShippingMethod(value, "pickup")
                  }
                }}
                aria-label="Pickup location"
                data-testid="delivery-options-container"
              >
                {_pickupMethods?.map((option) => (
                  <Radio
                    key={option.id}
                    value={option.id}
                    disabled={option.insufficient_inventory}
                    data-testid="delivery-option-radio"
                    className={optionClass(
                      option.id === shippingMethodId,
                      option.insufficient_inventory
                    )}
                  >
                    <span className="flex items-start gap-3">
                      <RadioMark checked={option.id === shippingMethodId} />
                      <span className="flex flex-col">
                        <span>{option.name}</span>
                        <span className="text-ink/70">
                          {formatAddress(
                            (option as unknown as ServiceZone).service_zone
                              ?.fulfillment_set?.location?.address
                          )}
                        </span>
                      </span>
                    </span>
                    <span className="font-mono">{priceOf(option)}</span>
                  </Radio>
                ))}
              </RadioGroup>
            </div>
          )}

          <ErrorMessage error={error} data-testid="delivery-option-error-message" />

          {!shippingMethodId && (
            <p className="text-small text-ink/75">
              Choose a shipping method to continue.
            </p>
          )}

          <div>
            <Button
              size="large"
              onClick={handleSubmit}
              loading={isLoading}
              disabled={!cart.shipping_methods?.[0]}
              data-testid="submit-delivery-option-button"
            >
              Continue to payment
            </Button>
          </div>
        </div>
      ) : selected ? (
        <div className="flex flex-col gap-1" data-testid="delivery-summary">
          <h3 className="text-small font-semibold text-ink">Method</h3>
          <p className="text-small text-ink/80">
            {selected.name}{" "}
            <span className="font-mono">
              {convertToLocale({
                amount: selected.amount ?? 0,
                currency_code: cart.currency_code,
              })}
            </span>
          </p>
        </div>
      ) : null}

      {isOpen && (
        <p className="mt-4 text-small text-ink/75">
          Need to change the address?{" "}
          <LocalizedClientLink
            href="/checkout?step=address"
            scroll={false}
            className={linkClass}
          >
            Go back to the address
          </LocalizedClientLink>
          .
        </p>
      )}
    </StepSection>
  )
}

export default Shipping
