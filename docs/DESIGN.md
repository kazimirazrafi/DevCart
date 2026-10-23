# DevCart — Design Plan

Status: **proposal, awaiting owner approval.** No page is built from this yet.

## 1. Subject, audience, and job

The spec names the store **DevCart** but does not define what it sells, so this is a proposal.

- **Subject:** a small direct-to-consumer brand selling merchandise for people who build software — apparel (tees, hoodies, caps, totes) plus desk objects (mugs, keycaps, notebooks, stickers). Everything is drawn from software-making culture: version numbers, changelogs, compiler and terminal culture, hardware and keyboards.
- **Audience:** developers, computer-science students, and engineering teams buying personal items or small team swag. They read Latin text in English, know what a keyboard shortcut is, and are unimpressed by generic tech-bro marketing. They buy on the strength of the joke, the typography, and the print quality.
- **Primary job:** make it easy to find one product, understand exactly what it is and what it costs, and check out in a few steps. Personality lives in the catalogue, not in the checkout.

The seed data in this repository is already apparel (tee, sweatshirt, sweatpants, shorts) with generic "Medusa" titles. The demo catalogue will be rewritten to fit the DevCart brand in Phase 1; the item types stay the same.

## 2. Colour — riso inks on uncoated stock

DevCart's catalogue is printed merchandise, so the palette is built from actual risograph ink behaviour: flat, slightly translucent inks, limited to one or two per impression, misregistering by a hair against each other. That constraint is the identity. It is also deliberately not the warm-cream-plus-terracotta look, and not near-black-plus-acid-green.

| Token | Hex | Role |
|-------|-----|------|
| `stock` | `#E8E9E3` | Page background. Cool uncoated paper, not a warm cream. |
| `ink` | `#17181B` | Body text, rules, plate borders. The "black" plate. |
| `riso-blue` | `#006DAE` | Primary brand colour: links, primary buttons, focus ring. |
| `riso-pink` | `#FB008E` | The accent. Large display text on stock, fills, markers. |
| `riso-yellow` | `#FFD400` | Fill only. Highlight behind ink text, used rarely. |
| `riso-green` | `#007942` | State: in stock, order confirmed. Text or fill. |

**AA adjustment.** `riso-blue`, `riso-pink` and `riso-green` are darkened from the raw riso ink values (`#0078BF`, `#FF48B0`, `#00A95C`) so that every permitted text usage meets WCAG AA. Hue is preserved in each case. §2.1 records the measurements; `stock`, `ink` and `riso-yellow` are unchanged.

Rules of use:

- **Two inks per view, maximum.** `ink` + `riso-blue` is the default impression. `riso-pink` is the second ink, and it earns its place by marking something specific (an on-sale price, the current filter, the hero headline).
- **Overprint, not shadow.** Where two inks meet, use `mix-blend-mode: multiply` so the overlap darkens like real ink. This replaces drop shadows entirely — no soft grey card shadows anywhere.
- Yellow and green never carry meaning on their own; they always sit next to a word that says the same thing.

### 2.1 Contrast, measured

Ratios are WCAG 2.1 relative-luminance contrast ratios against the token pairs actually used. AA needs 4.5:1 for normal text and 3:1 for large text (24px+, or 19px+ bold) and for non-text markers and boundaries.

| Foreground | Background | Ratio | AA normal text | AA large text / markers |
|---|---|---|---|---|
| `ink` | `stock` | 14.54:1 | pass | pass |
| `stock` | `ink` | 14.54:1 | pass | pass |
| `ink` | `riso-yellow` | 12.40:1 | pass | pass |
| `ink` | `riso-pink` | 4.64:1 | pass | pass |
| `riso-blue` | `stock` | 4.53:1 | pass | pass |
| `stock` | `riso-blue` | 4.53:1 | pass | pass |
| `riso-green` | `stock` | 4.51:1 | pass | pass |
| `stock` | `riso-green` | 4.51:1 | pass | pass |
| `riso-pink` | `stock` | 3.13:1 | **fail** | pass |
| `stock` | `riso-pink` | 3.13:1 | **fail** | pass |
| `ink` | `riso-green` | 3.22:1 | **fail** | pass |
| `ink` | `riso-blue` | 3.21:1 | **fail** | pass |
| `riso-green` | `ink` | 3.22:1 | **fail** | pass |
| `blue` | `ink` | 3.21:1 | **fail** | pass |
| `riso-yellow` | `stock` | 1.17:1 | **fail** | **fail** |

Rules that follow from the table, and which the base components enforce:

- **`riso-pink` is never text below 24px.** It passes AA only as large display type, as a fill, or as a marker (3:1 for non-text). No body copy, no links, no form labels, no button labels.
- **Never `stock` on `riso-pink`** (3.13:1). Text on a pink fill is `ink` (4.64:1).
- **Never `ink` on `riso-blue`** (3.21:1). Text on a blue fill is `stock` (4.53:1).
- **Never `ink` on `riso-green`; use `stock` on green** (4.51:1). `riso-green` as text on `stock` is fine.
- **`riso-yellow` is a fill, never text**, and only ever behind `ink` (12.40:1).
- `riso-blue` and `riso-green` as text on `stock` both clear normal-text AA, so links and state labels may use them directly.

Two more tones come from `ink` with alpha rather than from a token. They are measured the same way, at the sizes they are actually used:

| Foreground | Background | Ratio | AA normal text |
|---|---|---|---|
| `ink/70` | `stock` | 6.00:1 | pass |
| `ink/60` | `stock` | 4.31:1 | **fail** |
| `ink/40` | `stock` | 2.46:1 | **fail** — disabled controls only |

So secondary text is `ink/70` or darker: facet counts, struck-through sale prices, placeholders and step numbers are all 12–14px, where `ink/60` misses AA. `ink/40` is only ever the label of a disabled control, which is exempt because nothing is being asked of the customer. The accessibility pass moved every `ink/60` text use to `ink/70`; the rule is the reason.

### 2.2 Dark mode

Dark mode is the same print, inverted: the sheet becomes the ink's near-black and the type becomes the stock. It is the six tokens and nothing else — `styles/globals.css` swaps their values under `.dark` on `<html>`, and `src/lib/theme.ts` is the only module that knows a mode exists. No component has a dark variant, which is why the two modes cannot drift.

| Token | Light | Dark | Why the dark value is what it is |
|---|---|---|---|
| `stock` | `#E8E9E3` | `#14151A` | Near-black, not `#000`: hairline plates and rules still need somewhere darker to sit. |
| `ink` | `#17181B` | `#E8E9E3` | The dark plate becomes the light one, unchanged. |
| `riso-blue` | `#006DAE` | `#6FB3E0` | `#006DAE` on near-black is 2.6:1. Re-mixed lighter at print strength, hue kept. |
| `riso-pink` | `#FB008E` | `#F27AB8` | Same reasoning; the dark sheet lets pink carry text it could not carry in light. |
| `riso-yellow` | `#FFD400` | `#6B5700` | Still a fill, never text, but a dark mustard so the paper still reads on it. |
| `riso-green` | `#007942` | `#56C08D` | As blue: darkened green is illegible on the dark sheet. |

Measured the same way as §2.1, with the light column alongside:

| Foreground | Background | Light | Dark | AA normal text (dark) |
|---|---|---|---|---|
| `ink` | `stock` | 14.54:1 | 14.93:1 | pass |
| `stock` | `ink` | 14.54:1 | 14.93:1 | pass |
| `riso-blue` | `stock` | 4.53:1 | 7.99:1 | pass |
| `stock` | `riso-blue` | 4.53:1 | 7.99:1 | pass |
| `riso-pink` | `stock` | 3.13:1 | 7.16:1 | pass |
| `stock` | `riso-pink` | 3.13:1 | 7.16:1 | pass |
| `riso-green` | `stock` | 4.51:1 | 8.09:1 | pass |
| `stock` | `riso-green` | 4.51:1 | 8.09:1 | pass |
| `ink` | `riso-yellow` | 12.40:1 | 5.75:1 | pass |
| `ink` | `riso-blue` | 3.21:1 | 1.87:1 | **fail** |
| `ink` | `riso-pink` | 4.64:1 | 2.08:1 | **fail** |
| `ink` | `riso-green` | 3.22:1 | 1.85:1 | **fail** |
| `stock` | `riso-yellow` | 1.17:1 | 2.59:1 | **fail** |

Rules that follow, and that the components already obey because they only name tokens:

- **Text on a coloured fill is always `stock`**, in both modes. `bg-riso-blue text-stock`, `bg-riso-pink text-stock` and `bg-riso-green text-stock` are the three permitted fills, and they invert together: the light ink becomes the dark text, and vice versa.
- **`ink` is never on a coloured fill** (1.85–2.08:1 in dark). This is the same rule as light mode, which is why one class string serves both.
- **`riso-yellow` is still a fill behind `ink`**, never text: the pairing is 5.75:1 in dark, so the "on sale" wash keeps working.
- **Ink tints follow the mode.** `ink/70` for secondary text measures 5.94:1 on the light sheet and 7.72:1 on the dark one; `ink/20` hairlines stay visible because they are 20% of the *current* ink over the *current* sheet.

How the mode is chosen and applied:

- A visitor's preference is `light`, `dark` or `system`, kept in `localStorage` under `dc-theme`. `system` reads `prefers-color-scheme` and follows it live; it is the default, so a first visit matches whatever the operating system is already doing.
- An inline script in `<head>` (`THEME_SCRIPT` in `src/lib/theme.ts`) adds the class before the first paint, so a returning visitor never sees the other mode flash. The server cannot know the preference, so `<html>` carries `suppressHydrationWarning` for that one attribute.
- `color-scheme` follows the mode, which is what makes scrollbars, form controls and Chrome's autofill background (`globals.css`) match, and the viewport `theme-color` gives the browser chrome a ground for each OS setting.
- The control is a three-way radio group, not a toggle: **Auto** is a real choice and the default, so a visitor can go back to following the OS. It is drawn twice from one component: as a compact icon group in the header at `small` and up, and with its words in the menu panel at every width. The footer used to hold it and does not any more — a preference nobody finds in a footer is one most visitors never learn exists, and the header is where a returning visitor looks. The panel is the copy that exists on a phone, which the header cannot be.
- Without JavaScript the server's light sheet is what loads; the class is only ever added, never removed, so nothing is left half-painted.

## 3. Typography

Two families plus one data face. Not Inter, not Space Grotesk, not a system stack.

- **Display — Bricolage Grotesque** (variable, Google Fonts). Headlines, the hero, product titles, category names. It has a slightly irregular poster-grotesque character that suits printed merchandise and looks unlike a default UI font. Used at large sizes with tight tracking, and only at large sizes.
- **Body / UI — IBM Plex Sans.** Paragraphs, labels, buttons, forms, navigation. Engineering heritage that fits the subject and stays legible at 14–16px, which is where a store's real reading happens.
- **Data — IBM Plex Mono.** Reserved for content that is genuinely machine data: SKUs, spec tables ("100% cotton / 240 gsm"), order numbers, and code-like product names. Not used for eyebrows, nav labels, or decorative captions.

Type scale (1.25 ratio, base 16px): 14 / 16 / 20 / 25 / 31 / 39 / 49 / 61. Body line length capped at ~72 characters; display lines at ~40.

Weights: Bricolage Grotesque 700 for display; IBM Plex Sans 400 for body, 600 for buttons and labels. Normal sentence case everywhere — no all-caps labels.

## 4. Layout — the press sheet

The page is treated as a print sheet, not a stack of floating cards. A visible hairline grid and small corner registration marks define the content area; every element is aligned to that grid.

- Content is **left-aligned** on a centred max-width column of 1280px, with a lopsided editorial rhythm: the 12-column grid is divided roughly 7/5 rather than 6/6, so nothing sits dead centre.
- Product cards are **plates**: square corners, a hairline `ink` border, the image on `stock`, and the title/price set below in a fixed type block. No border-radius, no shadow, no gradient. One consistent square edge is the system; rounded corners are never introduced.
- **No numbered markers** except where something really is a sequence — order status (placed → paid → shipped) and checkout steps. Product plates are not numbered.
- Sections are separated by rules and whitespace, not by alternating background colours.
- Mobile (360 / 768 / 1280) collapses the grid to one and two columns; the alignment stays left.

### Home

```
+----------------------------------------------------------+
| DevCart        Shop  Collections  About      Search  Cart |
+----------------------------------------------------------+
|                                                          |
|  Merch for                                               |
|  people who        [ hero: product photo with            |
|  build software    riso-pink and riso-blue plates        |
|                    offset against it ]                   |
|  [ Shop new ]  [ Browse all ]                             |
|                                                          |
+----------------------------------------------------------+
|  New this drop                                            |
|  +--------+  +--------+  +--------+  +--------+           |
|  | plate  |  | plate  |  | plate  |  | plate  |           |
|  +--------+  +--------+  +--------+  +--------+           |
+----------------------------------------------------------+
|  Collections:  Everyday  /  Desk  /  Limited Run          |
+----------------------------------------------------------+
```

### Listing (`/store`, category, collection)

```
+----------------------------------------------------------+
|  All products                 [ search ]                  |
+---------------+------------------------------------------+
| Sort          |  +--------+  +--------+  +--------+       |
|  Newest       |  | plate  |  | plate  |  | plate  |       |
| Category      |  +--------+  +--------+  +--------+       |
|  [x] Shirts   |  +--------+  +--------+  +--------+       |
| Price         |  | plate  |  | plate  |  | plate  |       |
|  |----o----|  |  +--------+  +--------+  +--------+       |
+---------------+------------------------------------------+
|                    <  1 2 3  >                            |
```

### Product

```
+-------------------------------+--------------------------+
|  [ gallery: main image ]      |  Hoodie                  |
|  +----+ +----+ +----+         |  EUR 45.00   in stock    |
|  |    | |    | |    |         |                          |
|  +----+ +----+ +----+         |  Size  [S] [M] [L] [XL]  |
|                               |  Colour [ink] [pink]     |
|                               |  [ Add to cart ]         |
|                               |  ---------------------   |
|                               |  Specs (mono table)      |
|                               |  SKU  DC-HOOD-INK-M      |
+-------------------------------+--------------------------+
```

## 5. Principles

1. **Ink is scarce.** Two colours per screen, one of them loud. If a third appears, something above it gets removed.
2. **The grid is visible and load-bearing.** Rules, registration marks, and plate edges carry real structure; they are not decoration. Removing them should break the layout's legibility, not just its mood.
3. **Type is the image.** Display headlines are content and are set as such. No stock-photo hero collages, no gradient washes, no icon-and-heading card trios.
4. **Products are editions.** Specs, SKUs and print details are shown as plain, useful facts — an honest product page is the brand's tone, not a marketing one.
5. **Motion is mechanical and rare.** Motion answers a click: adding to cart, opening the cart drawer, switching a variant image. No scroll-triggered fade-up on every section, no hover lift on every card. See §5.1.

### 5.1 Deferred polish

Three visual devices are **optional polish, built last** — after the pages and the commerce flows work, and only if they still earn their place:

1. **Registration marks** — small corner crop marks on plates and page sections.
2. **Overprint** — `mix-blend-mode: multiply` where two inks overlap.
3. **Settle-into-register** — the single page-load animation where plates align, respecting `prefers-reduced-motion`.

Until then, plates use plain hairline borders and no blend modes. The base components must look finished without any of these, so none of them may be load-bearing.
6. **Copy is plain.** Sentence case, active voice, one job per string. The button says "Add to cart", the toast says "Added to cart". Empty cart says what to do next; an error says what failed and how to fix it. No filler, no exclamation marks.

## 6. Review against the brief

Checked against the common generated-design defaults before building:

- **Changed:** the original pass used a warm cream `#F4F1EA` background with a serif display and a clay accent. That is the single most recognisable generated palette, so the ground moved to a cool uncoated `stock` `#E8E9E3`, the display face to Bricolage Grotesque, and the accent to riso pink — a colour that comes from the subject's actual production method rather than from a mood board.
- **Changed:** an early layout used rounded cards with soft shadows (the SaaS-card kit). Replaced with square hairline plates and multiply overprint, which is what printed merchandise actually looks like.
- **Changed:** mono was initially going to label nav items and eyebrows. Cut back to machine data only, since mono-for-labels is a template tell and this brief does not need it.
- **Changed:** the raw riso inks were kept for shape but darkened where they failed AA. Blue and green moved just far enough to clear 4.5:1 on `stock`; pink moved to 3.13:1 on stock while holding 4.64:1 for `ink` text on a pink fill. The exact riso values survive only as the hue reference in §2.
- **Kept, because the brief justifies it:** tight display typography and hard grid edges — this is a print catalogue, and those are its real conventions, not a stylistic costume.

## 7. Decisions confirmed by the owner

1. **Subject:** developer merchandise, as described in §1.
2. **Name:** DevCart.
3. **Mode:** light and dark, with a visitor-facing Light / Dark / Auto control in the header (and in the menu panel at every width) and Auto as the default; light remains the sheet the server sends. See §2.2.
4. **Headlines:** sentence case everywhere, including the wireframes above.
5. **Accessibility:** `riso-pink` and `riso-blue` must meet WCAG AA for any text usage; see §2.1.
6. **Polish:** registration marks, overprint and the settle animation are deferred to last; see §5.1.
