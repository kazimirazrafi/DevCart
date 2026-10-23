"use client"

import { MagnifyingGlass } from "@medusajs/icons"
import dynamic from "next/dynamic"

import useToggleState from "@lib/hooks/use-toggle-state"
import SearchDrawer from "./drawer"

/*
 * The search stack — InstantSearch, the hooks, the client — is ~100 kB and does
 * nothing until the drawer opens, so it is fetched then rather than shipped
 * with every page. `ssr: false` for the same reason: the server has no query to
 * render. The placeholder holds the panel's height while the chunk arrives so
 * the dialog does not resize under the pointer.
 */
const SearchPanel = dynamic(() => import("./search-panel"), {
  ssr: false,
  loading: () => (
    <p
      role="status"
      className="flex-1 px-4 py-6 text-center text-ink/70"
      data-testid="search-panel-loading"
    >
      Loading search&hellip;
    </p>
  ),
})

const Search = () => {
  const { state: isOpen, open, close } = useToggleState()

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Search products"
        className="flex h-full items-center px-1 hover:text-ink"
        data-testid="nav-search-button"
      >
        {/* The header's icons are one size and one tap target. */}
        <MagnifyingGlass aria-hidden="true" className="h-5 w-5" />
      </button>

      <SearchDrawer isOpen={isOpen} close={close}>
        <SearchPanel onNavigate={close} />
      </SearchDrawer>
    </>
  )
}

export default Search
