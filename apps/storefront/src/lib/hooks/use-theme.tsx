"use client"

import { useSyncExternalStore } from "react"

import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  setThemePreference,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@lib/theme"

/*
 * The mode is a browser fact, so it is read through useSyncExternalStore rather
 * than copied into state. Every control subscribes to the same store, and the
 * storage event carries a change to the other tabs.
 */

const subscribe = (onStoreChange: () => void) => {
  if (typeof window === "undefined") {
    return () => {}
  }

  const media = window.matchMedia("(prefers-color-scheme: dark)")

  const onSystemChange = () => {
    if (readThemePreference() === "system") {
      applyTheme("system")
    }

    onStoreChange()
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      applyTheme(readThemePreference())
      onStoreChange()
    }
  }

  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange)
  window.addEventListener("storage", onStorage)
  media.addEventListener("change", onSystemChange)

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange)
    window.removeEventListener("storage", onStorage)
    media.removeEventListener("change", onSystemChange)
  }
}

export const useTheme = (): {
  preference: ThemePreference
  resolved: ResolvedTheme
  setTheme: (preference: ThemePreference) => void
} => {
  const preference = useSyncExternalStore(
    subscribe,
    readThemePreference,
    () => "system" as ThemePreference
  )

  return {
    preference,
    resolved: resolveTheme(preference),
    setTheme: setThemePreference,
  }
}

export default useTheme
