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
  /**
   * The saved row, when the caller already knows it (the wishlist page reads
   * its own list). Otherwise the shared store answers, which is one request per
   * page for every heart on it.
   */
  initialEntry?: { id: string } | null
  /** `large` is the buy box's height, beside Add to cart. */
  size?: "small" | "large"
  /** Shows "Save" / "Saved" next to the heart. */
  withLabel?: boolean
  /**
   * Re-reads the route after a change, for a page whose own contents depend on
   * the wishlist (a removed plate has to disappear). The catalogue's hearts do
   * not set it: there, a refresh is a request that changes nothing.
   */
  refreshOnChange?: boolean
  /** Placed on the wrapper, for a heart laid over a card. */
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

/**
 * The heart.
 *
 * It is a real `button` with `aria-pressed`, not a link and not a checkbox: the
 * state is "saved / not saved" and a screen reader should hear that change.
 *
 * Nothing is drawn as saved until the server has confirmed it, and a failure is
 * reported rather than leaving a heart that lies. A signed-out visitor is sent
 * to sign in and brought back to the page they were on.
 *
 * Pink is the fill, never the words: `riso-pink` is 3.13:1 on `stock`, so it may
 * mark but not carry text (docs/DESIGN.md §2.1).
 */
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
        {/*
         * Pink is the fill and only the fill (3.13:1 on `stock`, so it may mark
         * but not carry words), and it gives way to the hover state so the
         * heart stays visible on the ink fill.
         */}
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
