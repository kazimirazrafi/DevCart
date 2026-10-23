"use client"

import Image from "next/image"
import type { Hit as HitType } from "instantsearch.js"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import { Text } from "@modules/common/components/ui"

export type ProductHit = HitType<{
  title: string | null
  handle: string | null
  thumbnail: string | null
}>

type SearchHitProps = {
  hit: ProductHit
  onNavigate?: () => void
}

const SearchHit = ({ hit, onNavigate }: SearchHitProps) => {
  if (!hit.handle) {
    return null
  }

  return (
    <li>
      <LocalizedClientLink
        href={`/products/${hit.handle}`}
        onClick={onNavigate}
        className="flex items-center gap-x-4 px-4 py-3 hover:bg-ink/5"
        data-testid="search-hit-link"
      >
        <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-rounded bg-ink/5">
          {hit.thumbnail ? (
            <Image
              src={hit.thumbnail}
              alt=""
              fill
              sizes="56px"
              className="object-cover object-center"
              draggable={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink/70">
              <PlaceholderImage size={20} />
            </div>
          )}
        </div>
        <Text className="txt-medium text-ink line-clamp-2">
          {hit.title}
        </Text>
      </LocalizedClientLink>
    </li>
  )
}

export default SearchHit
