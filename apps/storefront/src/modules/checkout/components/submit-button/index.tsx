"use client"

import { Button } from "@modules/design-system"
import React from "react"
import { useFormStatus } from "react-dom"

export function SubmitButton({
  children,
  variant = "primary",
  size = "medium",
  className,
  "data-testid": dataTestId,
}: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "transparent" | null
  size?: "small" | "medium" | "large"
  className?: string
  "data-testid"?: string
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      size={size}
      // The starter's "transparent" variant has no equivalent in the design
      // system; the outlined secondary button is the closest thing to it.
      variant={
        variant === "secondary" || variant === "transparent"
          ? "secondary"
          : "primary"
      }
      loading={pending}
      className={className}
      data-testid={dataTestId}
    >
      {children}
    </Button>
  )
}
