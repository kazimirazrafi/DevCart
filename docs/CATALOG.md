# Building the catalogue by hand

Everything in this guide happens in the admin dashboard at
<http://localhost:9000/app>. The store starts empty after
`pnpm run reset-catalog`, so the order below is also the order that makes the
storefront fill up: a category, a product with a price and stock, and the sales
channel that makes it visible.

## 0. Before you start

Start the backend and the storefront, then sign in:

```bash
pnpm run backend:dev      # http://localhost:9000, admin at /app
pnpm run storefront:dev   # http://localhost:8000
```

If no admin user exists yet:

```bash
cd apps/backend
pnpm exec medusa user -e admin@example.com -p supersecret
```

The reset keeps the parts of the store that are not catalogue, so these already
exist and do not need creating:

| Thing | Where | Why it matters |
| --- | --- | --- |
| Region (Bangladesh / BDT, or the seed's Europe / EUR) | Settings → Regions | Prices are per region currency and the storefront picks a region from the country code |
| Sales channel `Default Sales Channel` + publishable key | Settings → Sales channels | A product that is not in a sales channel is invisible in the storefront |
| Stock location (warehouse) | Settings → Locations & Shipping | Stock levels hang off a location; shipping options belong to it |
| Payment providers and shipping options | Settings → Regions / Locations & Shipping | Checkout needs at least one of each |

If any of those is missing, run `pnpm run backend:seed` once — it creates them —
then `pnpm run reset-catalog` to empty the catalogue it also creates.

## 1. Categories

**Products → Categories → Create.**

- **Name** is what the storefront shows; **handle** is the URL
  (`/bd/categories/<handle>`) and is generated from the name if left blank.
- **Parent category** nests it. The storefront lists top-level categories in the
  navigation and on the home page; a child is reachable at
  `/<country>/categories/<parent-handle>/<child-handle>`.
- **Status/visibility**: a category is public by default. Leave it that way
  unless you are still building it.
- A category with no products is still rendered as a link, so create the
  category first or hide it until it has products.

## 2. Products

**Products → Create.** The form is long; fill it in this order.

1. **Details** — title, subtitle (optional), handle, description, material,
   and media (drag images or pick from uploads). The first image becomes the
   thumbnail on listing pages.
2. **Organise** — collection, type, tags, and categories. Categories are what
   the navigation links to; the others are filters and groupings.
3. **Options and variants** — an option is what the customer chooses between
   (Size, Colour...). Add the option, its values, then one variant per
   combination. Each variant needs a title and, ideally, a unique SKU.
   A product with no options and a single variant is fine for one-size goods.
4. **Prices** — one price per variant per currency the region uses. The
   storefront reads the price for the visitor's region, so a USD-only price is
   invisible in a EUR store and vice versa.
5. **Inventory** — tick *Manage inventory* if the variant's stock should count
   down. Then open **Inventory** in the sidebar and set the quantity at the
   warehouse (see §3). Unticked variants are always buyable.
6. **Sales channels** — tick `Default Sales Channel` (or whichever channel the
   storefront's publishable key belongs to). This is the single most common
   reason a product does not appear in the shop.
7. **Status** — `Published` to sell, `Draft` to keep it out of the storefront
   while still visible in the admin.

Save. The product appears in the storefront listing only when it is published,
in the channel, has a price in the active region's currency, and has stock (or
does not manage inventory).

### Sales channels and the publishable key

The storefront authenticates with one publishable key, and that key is attached
to a sales channel. To find the channel:

**Settings → Sales channels**, or from the API:

```bash
curl -s -H "x-publishable-api-key: $NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY" \
  http://localhost:9000/store/products
```

An empty list with published products in the admin almost always means the
products are not in that channel.

## 3. Stock and inventory

**Inventory** in the sidebar lists every inventory item, which is created per
variant (one item may be shared by variants).

- **Stock at a location:** open an item → *Locations* → **Edit** on the
  warehouse row → set *Stocked quantity*. Buyable quantity is stocked minus
  reserved, so a cart or an unfulfilled order lowers it.
- **Reservations:** a cart reserves stock while the customer checks out. They
  expire, and reservations for completed orders are consumed on fulfillment.
  Delete a stale reservation to free the units.
- **Backorder:** allow it on the variant if you want to sell past zero.
- **Low-stock mail:** the backend's hourly job mails `LOW_STOCK_ALERT_EMAIL`
  when a level is at or below `LOW_STOCK_THRESHOLD` (default 5), once per
  location per cooldown. See `docs/SETUP.md` §15.

A variant with *Manage inventory* and no stock shows as sold out in the
storefront. That is the intended behaviour, not a bug.

## 4. Collections, tags, types

- **Collections** (Products → Collections) are curated groups with their own
  page and a slot on the home page.
- **Tags** are free-form labels and become store filters.
- **Types** group products by kind (Hoodie, Mug...), also used as a filter.

All three are optional; the storefront skips their sections when empty.

## 5. Bulk import and export

**Products → Export** writes a CSV and, when it finishes, puts a **Product
export** notification in the dashboard bell with the download link. **Import**
takes a CSV and asks for confirmation after it reports how many products it
will create and update.

Rules that avoid the usual failures:

- **Update needs IDs.** Keep `Product Id` (and `Variant Id` for variants) from
  an export to update; a row with only a handle creates a new product and
  fails if that handle already exists.
- **Option columns are required for new products.**
  `Variant Option 1 Name` / `Variant Option 1 Value` (and 2, 3...) are what
  create the product's options; a row without them fails with
  *Product options are not provided*.
- **Do not edit the header names.** Unknown columns are rejected by name
  (*Invalid column name(s) ...*).
- **An exported file is not re-importable as-is on this Medusa version
  (2.21.2):** the export writes a `Variant Thumbnail` column the importer does
  not accept. Delete that column (and any other rejected one named in the
  error) before importing the file back.
- **Import runs in the background.** The POST returns a summary and the result
  arrives as a **Product import** notification; a failed run says so there and
  the reason is in the backend log. Do not resubmit while one is running.
- **Sizes:** files are read in full in memory; keep imports to a few thousand
  rows per file.

Both features need Redis and the file module (already configured — see
`docs/SETUP.md` §19). Without Redis the workflow never leaves
*We are processing your export*.

### After an import: making the products live

The storefront's listing is served by the product search index, not read from
the products table, and it only returns products in the publishable key's sales
channel. A CSV whose `Product Sales Channel 1` column is empty (the common case
for a file that came from somewhere other than an export of this store)
creates products in no channel at all: they are published, priced and in the
admin, and the shop never shows them. Products deleted while the index was not
listening stay in that index and keep showing.

One command fixes both — it attaches every channel-less product to the store's
channel and rebuilds the index from the live catalogue:

```bash
cd apps/backend
pnpm run refresh-catalogue
```

Re-run it after any bulk change that did not go through the admin. To avoid
needing it in the first place, put the channel's name (`Default Sales Channel`)
in the CSV's `Product Sales Channel 1` column before importing.

## 6. Seeding a full catalogue

A fresh database can be filled with a complete department-store catalogue in
two commands:

```bash
cd apps/backend
pnpm run reset-catalog     # empty whatever is there
pnpm run seed-catalogue    # 194 products, 8 departments, 8 collections
```

It creates 23 leaf categories under 8 departments (electronics, women, men,
beauty, home & kitchen, grocery, sports, automotive), 8 curated collections, 5
tags, 23 product types, and 194 published products — each in its leaf category
and its department, in the store's sales channel, on the default shipping
profile, priced in USD and EUR, with a size option where the product has one
and stock at the warehouse. Product data and photography are vendored in
`apps/backend/src/scripts/data/storefront-catalogue.json`, so the run needs no
network and produces the same shop every time.

Re-running it is safe: existing products are skipped by handle, missing
department links are added, only missing stock levels are created, and the
search index is rebuilt at the end.

## 7. Resetting the catalogue

```bash
cd apps/backend
pnpm run reset-catalog
```

It deletes products (with their variants, options, images and inventory items),
product options, categories (deepest first), collections, tags, types, price
lists, every remaining inventory item and its reservations, and the low-stock
alert records. It keeps regions, currencies, taxes, the sales channel, the
stock location and its shipping options, payment providers, customers and
orders — deleting those would break checkout or destroy order history.

The reset removes the products it deletes from the search index. The listing
reads that index, so it empties immediately; the other pages (home, product,
category, collection) cache their reads for five minutes
(`CATALOGUE_REVALIDATE_SECONDS`) and then catch up on their own. A storefront
rebuild is only needed after a code change:

```bash
cd apps/storefront
pnpm run build
pnpm run start
```

## 8. Checking a product is really live

1. Admin: the product is **Published**, in the sales channel, and has at least
   one variant with a price.
2. Admin → Inventory: if it manages inventory, the warehouse has stock.
3. API: `GET /store/products?handle=<handle>` with the publishable key returns
   it (empty means channel, status, or price currency).
4. Storefront: `http://localhost:8000/bd/store` lists it; the product page is
   `http://localhost:8000/bd/products/<handle>`.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Admin shows the product, shop does not | Not published, or not in the storefront's sales channel |
| Product page 404s | Handle typo, or the product is a draft |
| Price is missing or 0 | No price for the region's currency |
| "Sold out" on every variant | *Manage inventory* with no stocked quantity at the location |
| Export never finishes | Backend started without `REDIS_URL` (see `docs/SETUP.md` §19) |
| Import fails on a column name | Exported CSV contains a column this version's importer rejects; remove it |
| Imported products missing from the shop, deleted ones still listed | The search index: run `pnpm run refresh-catalogue` (§5) |
| Categories missing after a change | The storefront's five-minute catalogue cache; wait for it, or restart in dev mode (§7) |
