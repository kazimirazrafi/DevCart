# Running the shop

Everything here happens in the admin dashboard at `http://localhost:9000/app`. The order below is also
the order that fills an empty storefront: a category, a product with a price and stock, and the sales
channel that makes it visible.

## Store setup

These exist after the seed and rarely change:

| Thing | Where | Why it matters |
|-------|-------|----------------|
| Region and currency | Settings, Regions | Prices are per region currency; the storefront picks a region from the country code |
| Sales channel and publishable key | Settings, Sales channels | A product outside the storefront's channel is invisible |
| Stock location | Settings, Locations and Shipping | Stock levels belong to a location; shipping options belong to it too |
| Payment providers | Settings, Regions | Checkout needs at least one |

The storefront authenticates with one publishable key. An empty `GET /store/products` while the admin
shows published products almost always means those products are in another channel.

## Categories

Products, Categories, Create.

- **Name** is shown in the storefront. **Handle** is the URL segment and is derived from the name when
  left blank.
- **Parent category** nests it. Top-level categories appear in the navigation and on the home page; a
  child is served at `/<country>/categories/<parent>/<child>`.
- A category with no products is still linked, so create it before the products or keep it hidden
  until it has some.

## Products

Products, Create. The form has four steps: Details, Organise, Variants and Upload images.

1. **Details** carries title, subtitle, handle, description, material and media. The first image
   becomes the listing thumbnail. At the bottom of this step there is also a **Details** field for the
   long-form section under the product photos; it takes Markdown, and an example is shown above the
   box. If Markdown is unfamiliar, write the text in any online editor and paste the result. The
   field is saved to the product as `metadata.details`, which is what the storefront renders.
2. **Organise** sets the collection, type, tags and categories. Categories drive the navigation; the
   others are filters.
3. **Variants** creates the options customers choose between (Size, Colour), their combinations, the
   SKU and a price per currency the region uses. A product with one size needs no options.
4. **Upload images** attaches the photos.

Publish the product when it is ready. It appears in the listing only when it is published, in the
channel, priced in the visitor's currency, and in stock or not managing inventory.

The rich-text **Details** card on an existing product's page edits the same `metadata.details` field,
so copy written on the create page can be refined later in the editor.

## Inventory

Inventory lists one item per variant, though variants can share one.

- **Stock at a location:** open the item, open Locations, Edit the warehouse row, set Stocked quantity.
  Buyable quantity is stocked minus reserved, so a cart or an unfulfilled order lowers it.
- **Reservations:** a cart reserves while the customer checks out. Reservations expire, and those for a
  completed order are consumed on fulfillment. Delete a stale reservation to free the units.
- **Backorder:** allow it on the variant to sell past zero.
- **Low stock:** the hourly job mails `LOW_STOCK_ALERT_EMAIL` when a level is at or below
  `LOW_STOCK_THRESHOLD` (default 5), once per location per cooldown.

A variant that manages inventory with no stock shows as sold out in the storefront. That is intended.

## Collections, tags and types

- **Collections** are curated groups with their own page and a home page slot.
- **Tags** are free labels and become storefront filters.
- **Types** group products by kind and are also a filter.

All three are optional; the storefront skips empty sections.

## Bulk import and export

**Export** writes a CSV and puts a notification in the dashboard bell with the download link.
**Import** reads a CSV and reports how many products it will create and update before running.

The sample download inside the import drawer is this store's template, served from
`/static/product-import-template.csv` and kept at `apps/backend/static/product-import-template.csv`.
It has two rows, categories written by name, and a `Product Metadata` cell carrying the details
Markdown.

Rules that avoid the usual failures:

- **Categories and tags can be names.** `Product Category 1` through `N` and `Product Tag 1` through
  `N` accept names or handles, and a name that does not exist is created. `Product Category` or
  `Product Category Name` also works as a single cell with several names separated by `|` or `;`. A
  path such as `Home & Kitchen/Kitchen Accessories` creates the parent first.
- **Sales channel and shipping profile need ids.** `Product Sales Channel 1` and `Shipping Profile Id`
  must be ids; copy them from an export. Empty channel means the product never reaches the storefront.
- **Updates need ids.** Keep `Product Id`, and `Variant Id` for variants, to update. A row with only a
  handle creates a new product and fails if that handle exists.
- **Option columns are required for new products.** `Variant Option 1 Name` and `Variant Option 1
  Value` are what create the options.
- **Do not rename headers.** Unknown columns are rejected by name.
- **An export of this Medusa version is not directly re-importable.** The export writes a
  `Variant Thumbnail` column the importer does not accept; delete it before importing.
- **Imports run in the background.** The result arrives as a notification. Failed rows are reported
  there and the reason is in the backend log.

Import and export need Redis; without it they stay in processing.

### After a bulk change

The storefront listing reads the search index, not the products table, and only returns products in
the publishable key's channel. A file without a channel column creates published, priced products the
shop never shows.

```bash
cd apps/backend
pnpm run refresh-catalogue
```

This attaches every channel-less product to the store's channel and rebuilds the index. Run it after
any bulk change that did not go through the admin.

## Discounts

Promotion codes are configured under Discounts. The seed creates a few demo codes; create new ones
with an amount or percentage rule, a minimum order value if needed, and a start and end date. A code
applies at checkout through the cart's discount field.

## Orders and fulfilment

Orders collects every order with payment and fulfillment status. Inside an order:

- **Mark as paid** is for cash on delivery, which is not charged online.
- **Create fulfillment** picks the items and the location, then **Mark as shipped** records the
  tracking number. The customer gets a shipment email when Resend is configured.
- **Capture payment** charges an authorised card if the provider was configured without automatic
  capture.
- **Cancel** releases reserved stock.
- Orders are also readable by the customer from their account page, and by a guest through the signed
  link in the confirmation email.

## Reviews

Reviews live on the product page as a widget, and the moderation queue is under the same widget's
list. New reviews arrive as `pending`; approving one makes it visible on the storefront and counts it
in the product's rating. Rejecting keeps it hidden. The review body and title are plain text, the
rating is one to five.

## Newsletter, wishlists and stock alerts

- **Newsletter** subscribers are stored by the backend and can be read through the API or the database.
  The storefront form posts to `POST /store/newsletter`, with rate limiting per caller.
- **Wishlists** are per customer. The storefront reads and writes them through `/store/wishlist`.
- **Stock alerts** are internal: the job records what it has already mailed so the same product is not
  repeated inside the cooldown.

## The dashboard

The admin opens on a sales dashboard rather than Medusa's Orders page. It shows revenue, order count,
new against returning customers, units sold, low-stock products and the series behind them, with a
range selector. The same summary is available as a widget on the store page, and the figures come from
`/admin/dashboard` and `/admin/sales-summary`.

## Seeding and resetting

```bash
cd apps/backend
pnpm run seed-catalogue      # the demo catalogue on its own
pnpm run reset-catalog       # remove products, categories, collections, tags, stock
pnpm run refresh-catalogue   # reattach products to the channel and reindex
```

`pnpm run backend:seed` from the repository root runs the whole chain: store setup, catalogue,
reviews, then channel links and reindex.

`reset-catalog` keeps regions, currencies, taxes, the sales channel, the stock location and its
shipping options, payment providers, customers and orders. Deleting those would break checkout or
destroy order history.

## Checking that a product is live

1. Admin: published, in the sales channel, at least one priced variant.
2. Inventory: if it manages inventory, the warehouse has stock.
3. `GET /store/products?handle=<handle>` with the publishable key returns it.
4. The storefront lists it at `/<country>/store` and serves it at `/<country>/products/<handle>`.

## Troubleshooting

| Symptom | Cause |
|---------|-------|
| Product is published but not in the shop | No sales channel, or the index is stale. Run `pnpm run refresh-catalogue` |
| Storefront shows the old price | Cached page. The catalogue pages revalidate within five minutes |
| Import fails on a category | The column held an id that does not exist; use a name instead |
| Imported products are missing images | The `Product Thumbnail` cell was empty or the URL is not public |
| Card payment option missing at checkout | No Stripe keys, or the region was not reseeded after adding them |
| Confirmation email not sent | Resend is not configured, or `RESEND_FROM` is not a verified sender |
| Guest cannot complete checkout | Email verification is on and the address was not confirmed |
