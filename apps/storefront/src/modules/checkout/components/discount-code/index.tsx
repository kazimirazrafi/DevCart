"use client"

import { applyPromotionCode, removePromotionCode } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import Trash from "@modules/common/icons/trash"
import { Button, Input } from "@modules/design-system"
import { useRouter } from "next/navigation"
import React from "react"

import ErrorMessage from "../error-message"

type DiscountCodeProps = {
  cart: HttpTypes.StoreCart
}

/**
 * The cart's promotion codes.
 *
 * A code is applied by sending the cart's whole code list, and Medusa answers
 * `200` whether or not the code was accepted, so the server action reads the
 * applied promotions back and reports a refusal. The code stays in the field
 * when it is refused, because the customer most likely mistyped it.
 */
const DiscountCode: React.FC<DiscountCodeProps> = ({ cart }) => {
  const router = useRouter()
  const [isOpen, setIsOpen] = React.useState(false)
  const [code, setCode] = React.useState("")
  const [errorMessage, setErrorMessage] = React.useState("")
  const [pending, setPending] = React.useState(false)

  const promotions = cart.promotions ?? []

  const run = async (
    action: () => Promise<{ ok: true } | { ok: false; message: string }>
  ) => {
    setPending(true)
    setErrorMessage("")

    try {
      const result = await action()

      if (!result.ok) {
        setErrorMessage(result.message)
        return
      }

      router.refresh()
    } catch {
      // The actions return their failures; this only catches what escaped one.
      setErrorMessage("Could not update the promotion code. Try again.")
    } finally {
      setPending(false)
    }
  }

  const apply = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!code.trim()) {
      setErrorMessage("Enter a promotion code.")
      return
    }

    void run(async () => {
      const result = await applyPromotionCode(code)

      if (result.ok) {
        // Only clear the field once the cart really holds the code.
        setCode("")
        setIsOpen(false)
      }

      return result
    })
  }

  const remove = (appliedCode: string) =>
    void run(() => removePromotionCode(appliedCode))

  return (
    <div className="flex w-full flex-col">
      <form onSubmit={apply} className="w-full" noValidate>
        <div className="flex items-center gap-x-1">
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            type="button"
            className="text-small font-semibold text-riso-blue underline decoration-1 underline-offset-4 transition-colors duration-150 hover:text-ink"
            data-testid="add-discount-button"
          >
            {promotions.length ? "Add another promotion code" : "Add promotion code"}
          </button>
        </div>

        {isOpen && (
          <>
            <div className="mt-2 flex w-full items-end gap-x-2">
              {/* The field grows; the button keeps its own width. */}
              <div className="flex-1">
                <Input
                  id="promotion-input"
                  label="Promotion code"
                  name="code"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  disabled={pending}
                  data-testid="discount-input"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                loading={pending}
                disabled={!code.trim()}
                data-testid="discount-apply-button"
              >
                Apply
              </Button>
            </div>

            <ErrorMessage
              error={errorMessage}
              data-testid="discount-error-message"
            />
          </>
        )}
      </form>

      {!isOpen && errorMessage ? (
        <div className="mt-2">
          <ErrorMessage
            error={errorMessage}
            data-testid="discount-error-message"
          />
        </div>
      ) : null}

      {promotions.length > 0 && (
        <div className="mt-4 flex w-full items-center">
          <div className="flex w-full flex-col">
            <h3 className="mb-2 text-small font-semibold text-ink">
              {promotions.length === 1 ? "Promotion applied" : "Promotions applied"}
            </h3>

            {promotions.map((promotion) => {
              const method = promotion.application_method
              const value =
                method?.value !== undefined && method?.value !== null
                  ? method.type === "percentage"
                    ? `${Number(method.value)}%`
                    : convertToLocale({
                        amount: Number(method.value),
                        currency_code: method.currency_code ?? cart.currency_code,
                      })
                  : null

              return (
                <div
                  key={promotion.id}
                  className="mb-2 flex w-full max-w-full items-center justify-between gap-2"
                  data-testid="discount-row"
                >
                  <span className="flex min-w-0 items-baseline gap-x-2 text-small text-ink">
                    <span
                      className={
                        "shrink-0 border px-2 py-0.5 font-mono text-micro " +
                        (promotion.is_automatic
                          ? "border-riso-green text-riso-green"
                          : "border-ink text-ink")
                      }
                      data-testid="discount-code"
                    >
                      {promotion.code}
                    </span>
                    {value ? (
                      <span className="truncate text-ink">
                        {value} off
                        {promotion.is_automatic ? ", applied automatically" : ""}
                      </span>
                    ) : null}
                  </span>

                  {!promotion.is_automatic && (
                    <button
                      type="button"
                      className="flex shrink-0 items-center disabled:opacity-50"
                      onClick={() => remove(promotion.code ?? "")}
                      disabled={pending}
                      aria-label={`Remove promotion code ${promotion.code ?? ""}`}
                      data-testid="remove-discount-button"
                    >
                      <Trash size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default DiscountCode
