"use client"

/**
 * Which products the signed-in customer has saved, shared by every heart on the
 * page.
 *
 * One fetch per page load, not one per card: the first heart to mount starts
 * `GET /api/wishlist` and every other heart subscribes to the same snapshot.
 * The snapshot object identity only changes when the data does, which is what
 * `useSyncExternalStore` requires.
 *
 * It lives in a module rather than a React context because the hearts sit in
 * server-rendered plates scattered across the catalogue, and threading a
 * provider through every listing would mean a client boundary at the very top
 * of the page.
 */
export type WishlistEntrySnapshot = {
  id: string
  product_id: string
}

export type WishlistSnapshot = {
  /** `false` until the first answer arrives; hearts render as unsaved. */
  ready: boolean
  entries: WishlistEntrySnapshot[]
}

let snapshot: WishlistSnapshot = { ready: false, entries: [] }
let started = false
const listeners = new Set<() => void>()

const emit = () => {
  listeners.forEach((listener) => listener())
}

const publish = (entries: WishlistEntrySnapshot[]) => {
  snapshot = { ready: true, entries }
  emit()
}

const load = () => {
  if (started) return

  started = true

  fetch("/api/wishlist", { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : { items: [] }))
    .then((data: { items?: WishlistEntrySnapshot[] }) =>
      publish(data.items ?? [])
    )
    .catch(() => publish([]))
}

export const subscribeWishlist = (listener: () => void) => {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export const getWishlistSnapshot = (): WishlistSnapshot => {
  load()
  return snapshot
}

/**
 * The server-rendered snapshot, so a card does not flash an empty heart first.
 * It is one constant, not a fresh object per call: `useSyncExternalStore`
 * compares snapshots by identity, and a new object every render would make it
 * believe the data changed each time.
 */
const SERVER_SNAPSHOT: WishlistSnapshot = { ready: false, entries: [] }

export const getEmptyWishlistSnapshot = (): WishlistSnapshot => SERVER_SNAPSHOT

/**
 * Records the result of a toggle for every heart on the page, so tapping one
 * card's heart updates the same product wherever else it is shown.
 */
export const setWishlistEntry = (
  productId: string,
  entry: WishlistEntrySnapshot | null
) => {
  const others = snapshot.entries.filter(
    (item) => item.product_id !== productId
  )

  publish(entry ? [...others, entry] : others)
}
