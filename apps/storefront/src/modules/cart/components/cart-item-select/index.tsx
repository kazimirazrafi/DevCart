"use client"

import clsx from "clsx"
import { SelectHTMLAttributes, forwardRef } from "react"

import ChevronDown from "@modules/common/icons/chevron-down"

type NativeSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">

const CartItemSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span className="relative inline-flex items-center">
        <select
          ref={ref}
          className={clsx(
            "h-10 appearance-none rounded-square border border-ink bg-stock pl-3 pr-8 text-body text-ink",
            "transition-colors hover:border-riso-blue",
            "disabled:cursor-not-allowed disabled:border-ink/30 disabled:text-ink/40",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-2 flex text-ink">
          <ChevronDown />
        </span>
      </span>
    )
  }
)

CartItemSelect.displayName = "CartItemSelect"

export default CartItemSelect
