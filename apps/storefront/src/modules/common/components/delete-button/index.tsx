"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { deleteLineItem } from "@lib/data/cart"
import { Spinner, Trash } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"

const DeleteButton = ({
  id,
  children,
  className,
  "data-testid": dataTestId,
}: {
  id: string
  children?: React.ReactNode
  className?: string
  "data-testid"?: string
}) => {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /*
   * A removal that fails has to say so: the line stays on screen, so without a
   * message the click would look like it did nothing.
   */
  const handleDelete = async (id: string) => {
    setError(null)
    setIsDeleting(true)

    try {
      const result = await deleteLineItem(id)

      if (!result.ok) {
        setError(result.message)
        setIsDeleting(false)
      } else {
        // Same reason as the cart's quantity change: make the repaint explicit
        // rather than relying on the action's response to land.
        router.refresh()
      }
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Could not remove this item. Try again."
      )
      setIsDeleting(false)
    }
  }

  return (
    <div className={clx("flex flex-col gap-1", className)}>
      <button
        type="button"
        aria-busy={isDeleting || undefined}
        disabled={isDeleting}
        className="flex w-fit items-center gap-1.5 text-ink/70 underline decoration-1 underline-offset-4 transition-colors hover:text-ink disabled:cursor-not-allowed disabled:text-ink/40"
        onClick={() => handleDelete(id)}
        data-testid={dataTestId}
      >
        {isDeleting ? (
          <Spinner className="animate-spin" aria-hidden="true" />
        ) : (
          <Trash aria-hidden="true" />
        )}
        <span>{children}</span>
      </button>

      {error ? (
        <p role="alert" className="text-small text-ink">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export default DeleteButton
