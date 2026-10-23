import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { linkClass } from "@modules/design-system"
import React from "react"

const Help = () => {
  return (
    <div className="mt-6">
      <h2 className="text-lead font-semibold text-ink">Need help?</h2>
      <div className="my-2 text-body">
        <ul className="flex flex-col gap-y-2">
          <li>
            <LocalizedClientLink href="/contact" className={linkClass}>
              Contact
            </LocalizedClientLink>
          </li>
          <li>
            <LocalizedClientLink href="/contact" className={linkClass}>
              Returns & Exchanges
            </LocalizedClientLink>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Help
