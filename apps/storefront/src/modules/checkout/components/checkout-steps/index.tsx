import { CheckCircleSolid } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import clsx from "clsx"

import {
  CHECKOUT_STEPS,
  isStepComplete,
  isStepReachable,
  type CheckoutAccess,
  type CheckoutStepId,
} from "../../lib/steps"

const CheckoutSteps = ({
  cart,
  current,
  access,
}: {
  cart: HttpTypes.StoreCart
  current: CheckoutStepId
  access: CheckoutAccess
}) => (
  <nav aria-label="Checkout progress" data-testid="checkout-steps">
    <ol className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
      {CHECKOUT_STEPS.map((step, index) => {
        const reachable = isStepReachable(cart, step.id, access)
        const complete = isStepComplete(cart, step.id, access)
        const isCurrent = step.id === current

        const marker = (
          <>
            <span aria-hidden="true" className="font-mono text-micro text-ink/70">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              className={clsx(
                "text-small",
                isCurrent ? "font-semibold text-ink" : "text-ink/70"
              )}
            >
              {step.label}
            </span>
            {complete && (
              <>
                <CheckCircleSolid className="h-4 w-4 text-riso-green" />
                <span className="sr-only">completed</span>
              </>
            )}
          </>
        )

        const itemClass = clsx(
          "inline-flex items-center gap-2",
          !reachable && "opacity-50"
        )

        return (
          <li
            key={step.id}
            data-testid={`checkout-step-nav-${step.id}`}
            data-state={isCurrent ? "current" : complete ? "complete" : "todo"}
          >
            {reachable ? (
              <LocalizedClientLink
                href={`/checkout?step=${step.id}`}
                scroll={false}
                aria-current={isCurrent ? "step" : undefined}
                className={clsx(
                  itemClass,
                  !isCurrent && "hover:text-riso-blue"
                )}
              >
                {marker}
              </LocalizedClientLink>
            ) : (
              <span aria-disabled="true" className={itemClass}>
                {marker}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  </nav>
)

export default CheckoutSteps
