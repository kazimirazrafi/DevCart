# Design

The storefront's look is borrowed from a two-colour print shop: uncoated paper, black ink, riso spot colours used as solids and never as gradients, square corners throughout, and rules (thin lines) doing the work that shadows do elsewhere.

Everything below is implemented in `apps/storefront`. The preview page at `/{country}/design` renders every token and base component in both themes and is the place to check a change.

## Palette

Tokens are CSS custom properties in `src/styles/globals.css`, declared as raw sRGB channels so Tailwind can build `rgb(... / <alpha-value>)` utilities from them and opacity modifiers keep working. Tailwind exposes them as `stock`, `ink`, `riso-blue`, `riso-pink`, `riso-yellow` and `riso-green`.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `stock` | `#E8E9E3` | `#14151A` | Page ground |
| `ink` | `#17181B` | `#E8E9E3` | Body and display type, rules |
| `riso-blue` | `#006DAE` | `#6FB3E0` | Primary action, links, focus ring |
| `riso-pink` | `#FB008E` | `#F27AB8` | Sale and attention marks; never small text on light |
| `riso-yellow` | `#FFD400` | `#6B5700` | Large solid panels only |
| `riso-green` | `#007942` | `#56C08D` | In-stock and success marks |

**Rules that keep contrast honest.** Text is `ink` on `stock`, or `stock` on a riso fill; a riso colour is never used as small text on `stock`. `riso-pink` is display-only in light mode because it fails AA as a foreground at body sizes. `riso-yellow` is a fill that carries display type at large sizes, not a text colour. Dark mode re-mixes each ink for a dark ground rather than reusing the light hex, which would fall under 3:1.

Colour is never the only signal: stock state, sale and field errors pair the colour with a word or an icon, so a monochrome or colour-blind reading still works.

## Type

Three families, loaded with `next/font` (self-hosted, no layout shift):

- **Display** — Bricolage Grotesque. Headings and the hero only; never body copy.
- **Body** — IBM Plex Sans. All running text and form values.
- **Mono** — IBM Plex Mono. Prices, order numbers, stock counts, SKUs: anything a customer might read digit by digit.

Scale comes from Tailwind's `fontSize` in `tailwind.config.js` plus the `.text-*` component classes in `globals.css` for the sizes used across the shop (micro through 3xl).

## Space and shape

- `--dc-gutter` (1.5rem) is the page edge, `--dc-section` (6rem) the space between bands, `--dc-content` (80rem) the reading width. `content-container` applies the last two.
- `--dc-radius` is `0px`. Nothing in the shop is rounded except a handful of controls that would look broken square; buttons, plates and panels are not.
- Layouts are a grid of bands separated by `Rule`. A band is one idea: a heading, a rail of products, a form step.

## Components

`src/modules/design-system` holds the shared pieces: `Button` (variants and sizes, `buttonClass` for links that look like buttons), `Input` (label, hint, error), `Link`, `Plate` (the image well — a coloured solid with a caption when there is no photograph), and `Rule`. Everything else lives in its feature module under `src/modules/<feature>` and composes these.

**Interaction.** One focus ring for the whole system (`:focus-visible`, blue, 2px with a 2px offset), never removed. Every control is reachable and operable by keyboard; panels close on `Escape`; menus trap focus while open. Hover states change the ground or the rule, not the type's weight. Motion is short and only ever clarifies what changed: panels slide, the accordion chevron turns, skeletons pulse.

**Reduced motion.** `prefers-reduced-motion` settles every animation and transition to its end state — `0.01ms` rather than `none`, so transition `end` handlers (which Headless UI needs to unmount a panel) still fire.

## Dark mode

The same print, inverted: paper becomes the ink's near-black and type becomes the stock. A light/dark/system preference is stored in `localStorage` (`dc-theme`) and applied as a `dark` class on `<html>` by `src/lib/theme.ts`; a small blocking script in the root layout applies it before paint, so there is no flash of the wrong theme.

## Assets

Product photography is loaded through `next/image` with the optimiser on, and both image hosts are named in `remotePatterns` in `next.config.js`. A product with no image is not a grey box: `Plate` prints a solid riso ground, and the product card labels it "No image", which is part of the look rather than a fallback.
