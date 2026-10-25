import { Dialog, Transition } from "@headlessui/react"
import clsx from "clsx"
import React, { Fragment, useMemo } from "react"

import { getProductPrice } from "@lib/util/get-product-price"
import { isSimpleProduct } from "@lib/util/product"
import useToggleState from "@lib/hooks/use-toggle-state"
import { HttpTypes } from "@medusajs/types"
import ChevronDown from "@modules/common/icons/chevron-down"
import X from "@modules/common/icons/x"
import { Button } from "@modules/design-system"

import OptionSelect from "./option-select"

type MobileActionsProps = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  options: Record<string, string | undefined>
  updateOptions: (title: string, value: string) => void
  inStock?: boolean
  handleAddToCart: () => void
  isAdding?: boolean
  show: boolean
  optionsDisabled: boolean
}

const MobileActions: React.FC<MobileActionsProps> = ({
  product,
  variant,
  options,
  updateOptions,
  inStock,
  handleAddToCart,
  isAdding,
  show,
  optionsDisabled,
}) => {
  const { state, open, close } = useToggleState()

  const price = getProductPrice({
    product: product,
    variantId: variant?.id,
  })

  const selectedPrice = useMemo(() => {
    if (!price) {
      return null
    }
    const { variantPrice, cheapestPrice } = price

    return variantPrice || cheapestPrice || null
  }, [price])

  const isSimple = isSimpleProduct(product)

  return (
    <>
      <div
        className={clsx("fixed inset-x-0 bottom-0 z-50 small:hidden", {
          "pointer-events-none": !show,
        })}
      >
        <Transition
          as={Fragment}
          show={show}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="flex w-full flex-col items-center justify-center gap-3 border-t border-ink bg-stock p-4"
            data-testid="mobile-actions"
          >
            <div className="flex items-center gap-x-2 text-small">
              <span className="font-semibold" data-testid="mobile-title">
                {product.title}
              </span>
              <span aria-hidden="true" className="text-ink/50">
                —
              </span>
              {selectedPrice ? (
                <span className="flex items-baseline gap-x-2 font-mono text-ink">
                  {selectedPrice.price_type === "sale" && (
                    <s className="text-ink/70">{selectedPrice.original_price}</s>
                  )}
                  <span>{selectedPrice.calculated_price}</span>
                </span>
              ) : null}
            </div>
            <div
              className={clsx("grid w-full grid-cols-2 gap-x-4", {
                "grid-cols-1": isSimple,
              })}
            >
              {!isSimple && (
                <Button
                  onClick={open}
                  variant="secondary"
                  className="w-full"
                  data-testid="mobile-actions-button"
                >
                  <span className="flex w-full items-center justify-between">
                    <span>
                      {variant ? Object.values(options).join(" / ") : "Select options"}
                    </span>
                    <ChevronDown />
                  </span>
                </Button>
              )}
              <Button
                onClick={handleAddToCart}
                disabled={!inStock || !variant}
                loading={isAdding}
                className="w-full"
                data-testid="mobile-cart-button"
              >
                {!variant ? "Select variant" : !inStock ? "Out of stock" : "Add to cart"}
              </Button>
            </div>
          </div>
        </Transition>
      </div>

      <Transition appear show={state} as={Fragment}>
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
            <div className="fixed inset-0 bg-ink/40" aria-hidden="true" />
          </Transition.Child>

          <div className="fixed inset-x-0 bottom-0">
            <div className="flex min-h-full h-full items-center justify-center text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Panel
                  className="flex h-full w-full transform flex-col gap-y-3 overflow-hidden border-t border-ink bg-stock text-left"
                  data-testid="mobile-actions-modal"
                >
                  <Dialog.Title className="sr-only">
                    Choose options
                  </Dialog.Title>
                  <div className="flex w-full justify-end pr-6 pt-6">
                    <button
                      type="button"
                      onClick={close}
                      aria-label="Close"
                      className="flex h-11 w-11 items-center justify-center border border-ink bg-stock text-ink"
                      data-testid="close-modal-button"
                    >
                      <X />
                    </button>
                  </div>
                  <div className="px-6 pb-12">
                    {(product.variants?.length ?? 0) > 1 && (
                      <div className="flex flex-col gap-y-6">
                        {(product.options || []).map((option) => (
                          <OptionSelect
                            key={option.id}
                            option={option}
                            current={options[option.id]}
                            updateOption={updateOptions}
                            title={option.title ?? ""}
                            disabled={optionsDisabled}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default MobileActions
