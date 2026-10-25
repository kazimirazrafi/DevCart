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
