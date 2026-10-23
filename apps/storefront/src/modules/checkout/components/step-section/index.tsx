import { CheckCircleSolid } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { linkClass, Rule } from "@modules/design-system"
import type { ReactNode } from "react"

import type { CheckoutStepId } from "../../lib/steps"

type StepSectionProps = {
  id: CheckoutStepId
  /** Position in the sequence, from one. */
  number: number
  title: string
  isOpen: boolean
  complete: boolean
  children: ReactNode
}

/**
 * One step of the checkout: a numbered heading, the step's own content, and a
 * closing rule. Every step is built from this shell so the chrome cannot drift
 * between them, and so "closed" always means the same thing — the step has been
 * answered and can be reopened by clicking it in the stepper or its Edit link.
 */
const StepSection = ({
  id,
  number,
  title,
  isOpen,
  complete,
  children,
}: StepSectionProps) => (
  <section
    aria-labelledby={`checkout-step-heading-${id}`}
    data-testid={`checkout-step-${id}`}
    data-state={isOpen ? "open" : "closed"}
  >
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2
        id={`checkout-step-heading-${id}`}
        className="flex items-baseline gap-2 font-display text-h3 font-bold"
      >
        <span aria-hidden="true" className="font-mono text-micro text-ink/70">
          {String(number).padStart(2, "0")}
        </span>
        {title}
      </h2>

      {complete && !isOpen && (
        <LocalizedClientLink
          href={`/checkout?step=${id}`}
          scroll={false}
          className={`${linkClass} inline-flex items-center gap-1 text-small`}
          data-testid={`edit-${id}-step`}
        >
          <CheckCircleSolid className="h-4 w-4" />
          Edit
        </LocalizedClientLink>
      )}
    </div>

    <div className="pt-4">{children}</div>

    <Rule className="mt-8" />
  </section>
)

export default StepSection
