/* Light, dark, or whatever the operating system says. Every colour is a CSS
 * variable, so the mode is applied as a class on <html>. */

/** Where the chosen mode is remembered between visits. */
export const THEME_STORAGE_KEY = "dc-theme"

/** Fired on `window` whenever the mode changes. */
export const THEME_CHANGE_EVENT = "dc-theme-change"

export type ThemePreference = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system"

export const prefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches

/** The mode a preference resolves to. */
export const resolveTheme = (preference: ThemePreference): ResolvedTheme =>
  preference === "system" ? (prefersDark() ? "dark" : "light") : preference

/** Anything unrecognised means "follow the OS". */
export const readThemePreference = (): ThemePreference => {
  if (typeof window === "undefined") {
    return "system"
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)

    return isThemePreference(stored) ? stored : "system"
  } catch {
    // Storage can be unavailable (private mode, blocked cookies).
    return "system"
  }
}

/** Applies a preference: the class swaps the tokens, `color-scheme` fixes scrollbars and controls. */
export const applyTheme = (preference: ThemePreference): ResolvedTheme => {
  if (typeof document === "undefined") {
    return "light"
  }

  const resolved = resolveTheme(preference)
  const root = document.documentElement

  root.classList.toggle("dark", resolved === "dark")
  root.style.colorScheme = resolved

  return resolved
}

export const setThemePreference = (preference: ThemePreference) => {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // A preference that cannot be stored is still applied for this visit.
  }

  applyTheme(preference)
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

/** Runs inline in <head> before the first paint, so the wrong mode never flashes. */
export const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=s==="dark"||((s==="system"||!s)&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d){r.classList.add("dark")}else{r.classList.remove("dark")}r.style.colorScheme=d?"dark":"light"}catch(e){}})()`
