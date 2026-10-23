/**
 * Light, dark, or whatever the operating system says.
 *
 * The store is printed on paper (`docs/DESIGN.md` §2), so dark mode is the same
 * two inks inverted: the page becomes ink and the type becomes stock. Nothing
 * in a component knows about it — every colour is a CSS variable that this
 * module's `applyTheme` flips by way of a class on `<html>` — which is why the
 * only place a mode is named is here.
 */

/** Where the chosen mode is remembered between visits. */
export const THEME_STORAGE_KEY = "dc-theme"

/** Fired on `window` whenever the mode changes, so every control agrees. */
export const THEME_CHANGE_EVENT = "dc-theme-change"

export type ThemePreference = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === "light" || value === "dark" || value === "system"

export const prefersDark = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches

/** The mode a preference actually paints. */
export const resolveTheme = (preference: ThemePreference): ResolvedTheme =>
  preference === "system" ? (prefersDark() ? "dark" : "light") : preference

/** Reads the stored preference. Anything unrecognised means "follow the OS". */
export const readThemePreference = (): ThemePreference => {
  if (typeof window === "undefined") {
    return "system"
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)

    return isThemePreference(stored) ? stored : "system"
  } catch {
    // Storage can be unavailable (private modes, blocked cookies). The visit
    // still works; it just does not remember the choice.
    return "system"
  }
}

/**
 * Paints a preference: the `dark` class carries the token swap in
 * `styles/globals.css`, and `color-scheme` is what makes scrollbars, form
 * controls and the browser's own chrome follow.
 */
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
    // See readThemePreference: a preference that cannot be stored is still
    // applied for this visit.
  }

  applyTheme(preference)
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

/**
 * Runs in `<head>`, before the first paint, so a returning visitor never sees
 * the other mode flash. Kept as a string because it has to be inline: a
 * deferred script would run after the page has already been painted.
 */
export const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=s==="dark"||((s==="system"||!s)&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d){r.classList.add("dark")}else{r.classList.remove("dark")}r.style.colorScheme=d?"dark":"light"}catch(e){}})()`
