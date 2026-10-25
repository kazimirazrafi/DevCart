"use client"

/**
 * Which products the signed-in customer has saved, shared by every heart on the
 * page. The first heart to mount starts GET /api/wishlist; the rest subscribe to
 * the same snapshot, which only changes identity when the data does.
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
 * The server snapshot, so a card does not flash an empty heart first. One
 * constant, because useSyncExternalStore compares snapshots by identity.
 */
const SERVER_SNAPSHOT: WishlistSnapshot = { ready: false, entries: [] }

export const getEmptyWishlistSnapshot = (): WishlistSnapshot => SERVER_SNAPSHOT

/** Records a toggle for every heart on the page. */
export const setWishlistEntry = (
  productId: string,
  entry: WishlistEntrySnapshot | null
) => {
  const others = snapshot.entries.filter(
    (item) => item.product_id !== productId
  )

  publish(entry ? [...others, entry] : others)
}
