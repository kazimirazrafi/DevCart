"use client"

import clsx from "clsx"
import { usePathname, useRouter } from "next/navigation"
import { useState, useSyncExternalStore, useTransition } from "react"

import { addToWishlist, removeFromWishlist } from "@lib/data/wishlist"
import {
  getEmptyWishlistSnapshot,
  getWishlistSnapshot,
  setWishlistEntry,
  subscribeWishlist,
} from "@lib/util/wishlist-store"

type WishlistButtonProps = {
  productId: string
  variantId?: string | null
  initialEntry?: { id: string } | null
  size?: "small" | "large"
  withLabel?: boolean
  refreshOnChange?: boolean
  className?: string
}

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-5 w-5"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="square"
  >
    <path d="M12 20.5 4.2 12.9A4.6 4.6 0 0 1 12 6.2a4.6 4.6 0 0 1 7.8 6.7Z" />
  </svg>
)

const WishlistButton = ({
  productId,
  variantId,
  initialEntry,
  size = "small",
  withLabel,
  refreshOnChange,
  className,
}: WishlistButtonProps) => {
  const snapshot = useSyncExternalStore(
    subscribeWishlist,
    getWishlistSnapshot,
    getEmptyWishlistSnapshot
  )
  const pathname = usePathname()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const known =
    initialEntry ??
    snapshot.entries.find((entry) => entry.product_id === productId)

  const saved = Boolean(known)

  const toggle = () => {
    setError(null)

    startTransition(async () => {
      if (known) {
        const result = await removeFromWishlist(known.id)

        if (result.ok) {
          setWishlistEntry(productId, null)

          if (refreshOnChange) router.refresh()
        } else {
          setError(result.message)
        }

        return
      }

      const result = await addToWishlist(productId, variantId)

      if (result.ok) {
        setWishlistEntry(productId, {
          id: result.entry.id,
          product_id: productId,
        })

        if (refreshOnChange) router.refresh()

        return
      }

      if (result.requiresSignIn) {
        router.push(`/account?redirect=${encodeURIComponent(pathname)}`)
        return
      }

      setError(result.message)
    })
  }

  return (
    <span className={clsx("inline-flex flex-col items-start gap-1", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
        aria-busy={pending || undefined}
        disabled={pending}
        data-testid="wishlist-button"
        data-saved={saved}
        className={clsx(
          "group inline-flex items-center justify-center gap-2 rounded-square border border-ink bg-stock text-ink",
          "transition-colors duration-150 hover:bg-ink hover:text-stock",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-riso-blue",
          size === "large"
            ? withLabel
              ? "h-14 px-5 text-small font-semibold"
              : "h-14 w-14"
            : withLabel
              ? "h-11 px-4 text-small font-semibold"
              : "h-9 w-9"
        )}
      >
        <span
          className={clsx(
            "transition-colors",
            saved ? "text-riso-pink group-hover:text-stock" : undefined
          )}
        >
          <HeartIcon filled={saved} />
        </span>
        {withLabel ? <span>{saved ? "Saved" : "Save"}</span> : null}
      </button>

      {error ? (
        <span role="alert" className="max-w-[24ch] text-small text-ink">
          {error}
        </span>
      ) : null}
    </span>
  )
}

export default WishlistButton
