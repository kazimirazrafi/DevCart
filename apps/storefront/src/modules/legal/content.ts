import type { LegalLink } from "./links"

/**
 * The text of every policy the storefront publishes.
 *
 * It lives in one module rather than in the seven route files so the documents
 * can be read side by side and so a shared fact — the despatch window, the
 * thirty-day return period, the support address — is stated once. The pages
 * themselves only choose a document and render it.
 *
 * These are the store's own operating rules, not a template left for the owner
 * to fill in: the timing, the shipping options and the processor named here are
 * the ones the checkout and the seed data actually use.
 */
export type LegalSection = {
  heading: string
  paragraphs?: string[]
  list?: string[]
}

export type LegalDocument = {
  slug: string
  title: string
  description: string
  intro: string
  sections: LegalSection[]
}

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: "privacy-policy",
    title: "Privacy policy",
    description:
      "What DevCart collects, why it collects it, who it shares it with and how to exercise your rights over it.",
    intro:
      "This policy explains what personal data DevCart collects when you use this store, why we need it, and what you can ask us to do with it. It covers the storefront, the account area and the emails we send about your orders.",
    sections: [
      {
        heading: "What we collect",
        paragraphs: [
          "We collect the details you give us and the details an order needs. There is no analytics profile of you beyond that.",
        ],
        list: [
          "Account details: your email address, and the first and last name you choose to add.",
          "Order details: the products you bought, the prices, the currency, the order number and the date.",
          "Delivery and billing addresses, and a phone number if you add one for a courier.",
          "Correspondence: the messages you send to support, kept so we can answer them and refer back.",
          "Technical details needed to keep a session working: your cart identifier, your sign-in session and your country and currency choices.",
        ],
      },
      {
        heading: "Why we use it",
        paragraphs: [
          "We use your data to take payment, pack and send your order, tell you what happened to it, and answer your questions. That is the contract between us.",
          "We also use your email address to send order and delivery notifications, which are part of the order and not marketing. If you join the drop list, we use it for that list until you ask to leave.",
          "We keep records of orders and payments because tax and accounting rules require it, and we keep a small amount of technical data to keep accounts secure and prevent abuse.",
        ],
      },
      {
        heading: "Payments",
        paragraphs: [
          "Card payments are processed by Stripe when card payment is enabled for your region. Your card number is entered in Stripe's own payment form and is never sent to or stored by our servers. We receive the result of the payment, the amount, the currency and a reference we can use to find the transaction if something goes wrong.",
          "Where a region is configured for payment on delivery or another manual method, we record the payment status of the order but take no card details at all.",
        ],
      },
      {
        heading: "Cookies and local storage",
        paragraphs: [
          "We set a small number of cookies so the store works: one holds the contents of your cart, one keeps you signed in to your account, and one remembers the region you are shopping in. None of them is used to follow you around other websites.",
          "Your light or dark theme preference is stored in your browser's local storage, not in a cookie, and never reaches our servers. The cookie policy describes each of these in more detail.",
        ],
      },
      {
        heading: "Who we share it with",
        paragraphs: [
          "We share only what a provider needs to do its job, and only with providers that process data on our instructions.",
        ],
        list: [
          "Stripe, when card payment is enabled, to take and refund payments.",
          "Resend, to deliver order, delivery and account emails.",
          "Our hosting and database providers, which store the site and its data.",
          "A courier or postal service, which receives the name, address and phone number needed to deliver a parcel.",
          "Authorities, where the law requires us to hand something over.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: [
          "Order and payment records are kept for as long as tax and accounting rules require, which is usually six to seven years depending on the country. Contact messages are kept for two years so a later question can be answered with the earlier context.",
          "Account details are kept while the account exists. A closed account is deleted within thirty days, except for the order records we are obliged to keep. Newsletter addresses are deleted when you unsubscribe, and a signup that is never confirmed is deleted after thirty days.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [
          "Depending on where you live, you can ask us to show you the data we hold about you, correct it, delete it, restrict how we use it, or send it to another service in a portable format. You can object to a use you did not expect, and you can withdraw consent for marketing at any time.",
          "Write to support@kazimirazrafi.dev and we will answer within thirty days. We may ask you to confirm you are the account holder before we act. If you are not satisfied with our answer you can complain to the data-protection authority in your country.",
        ],
      },
      {
        heading: "Children",
        paragraphs: [
          "The store is not directed at children under sixteen, and we do not knowingly collect their data. If you believe a child has created an account, write to us and we will remove it.",
        ],
      },
      {
        heading: "Changes and contact",
        paragraphs: [
          "If this policy changes in a way that affects you, we will note the new date at the top and, for a significant change, email registered customers before it takes effect.",
          "Questions about this policy, or about the data we hold, go to support@kazimirazrafi.dev.",
        ],
      },
    ],
  },
  {
    slug: "terms-and-conditions",
    title: "Terms & conditions",
    description:
      "The agreement between you and DevCart when you browse the store, create an account or place an order.",
    intro:
      "These terms govern your use of the DevCart storefront and any order you place through it. By using the store or placing an order you accept them. If you do not accept them, please do not order.",
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          "DevCart is a small direct-to-consumer department store. It operates one warehouse and sells through this storefront only. In these terms, \"we\" and \"us\" mean DevCart, and \"you\" means the person browsing or ordering.",
        ],
      },
      {
        heading: "Your account",
        paragraphs: [
          "You need an account to see your orders and to write a review. Give us accurate details, keep your password to yourself, and tell us promptly if you think someone else has access to it.",
          "You are responsible for activity under your account. We may suspend an account that is used to abuse the store, but we will not delete order records that we are required to keep.",
          "You can close your account at any time by writing to support@kazimirazrafi.dev. Closing it does not cancel an order that is already with the courier.",
        ],
      },
      {
        heading: "Orders and acceptance",
        paragraphs: [
          "An order is an offer to buy. Our confirmation email acknowledges that we received it; the contract forms when we despatch the goods. Until then we may decline an order, for example if the item sold out between your checkout and our packing, or if the address cannot be delivered to.",
          "If we decline an order after taking payment, we refund the full amount to the original payment method.",
        ],
      },
      {
        heading: "Prices, availability and errors",
        paragraphs: [
          "Prices are shown in the currency of the region you are shopping in and include the tax that region applies. The total at checkout includes the products, the shipping option you choose and any applicable tax; nothing is added after you pay.",
          "Stock counts are the units we actually hold, and they can change while you are shopping. If an obvious pricing or description error is discovered before we despatch, we will contact you with the correct information and you may cancel for a full refund.",
        ],
      },
      {
        heading: "Payment",
        paragraphs: [
          "Card payments are processed by Stripe when card payment is enabled for your region. We do not store card numbers. Where a manual payment method is offered, the order is marked as paid when the payment is received.",
          "If a payment is reversed or fails after an order is despatched, we may ask you to pay again or to return the goods.",
        ],
      },
      {
        heading: "Delivery and returns",
        paragraphs: [
          "Orders are despatched within two business days. Standard delivery takes two to three business days after despatch; express delivery is expected within twenty-four hours after despatch. The shipping and delivery policy sets out the options, tracking and what happens when a parcel goes missing.",
          "Unused, unopened items can come back within thirty days of delivery for a refund to the original payment method. The returns and refunds policy sets out the conditions, the refund timing and the items we cannot accept.",
        ],
      },
      {
        heading: "Reviews and content you send us",
        paragraphs: [
          "Reviews are moderated before they appear, and we may decline one that is abusive, contains personal data about someone else, or is not about the product. By submitting a review you allow us to publish it with your first name and the initial of your surname beside the product.",
          "Do not send us material you do not have the right to share.",
        ],
      },
      {
        heading: "Intellectual property",
        paragraphs: [
          "The product photography, the written descriptions, the design of this store and the DevCart name are ours or used with permission. You may share links and quote short passages, but you may not copy the catalogue for a competing store or use our material commercially without written permission.",
        ],
      },
      {
        heading: "Acceptable use",
        paragraphs: [
          "Do not attempt to break the store, scrape it at a rate that degrades it for other customers, place orders with stolen payment details, or use the review form to post spam. We may block access and report unlawful activity to the relevant authority.",
        ],
      },
      {
        heading: "Liability",
        paragraphs: [
          "Nothing in these terms limits liability that cannot be limited by law, including liability for death or personal injury caused by negligence, or for fraud. We are responsible for foreseeable loss caused by us, but not for loss that was not foreseeable when the contract formed.",
          "Our maximum liability for an order is the amount you paid for it, except where the law says otherwise.",
        ],
      },
      {
        heading: "Changes and contact",
        paragraphs: [
          "We may update these terms; the date at the top says when they last changed, and an order is governed by the version in force when it was placed.",
          "Questions about these terms go to support@kazimirazrafi.dev.",
        ],
      },
    ],
  },
  {
    slug: "returns-and-refunds",
    title: "Returns & refunds",
    description:
      "How the thirty-day return window works at DevCart, which items can come back, and when a refund is paid.",
    intro:
      "You have thirty days from delivery to send back anything that is not right. This policy explains what we accept, how to start a return, and when the money reaches you.",
    sections: [
      {
        heading: "The thirty-day window",
        paragraphs: [
          "The window opens on the day the parcel is delivered and closes thirty days later. A return posted within the window is accepted even if it arrives after it, as long as you send us the tracking details on the day you post it.",
          "If an order arrives in several parcels, the window for each parcel starts when that parcel is delivered.",
        ],
      },
      {
        heading: "Condition of returned items",
        paragraphs: [
          "Items must be unused, unwashed and in the condition they arrived in, with the original tags, packaging and any accessories. Trying something on is fine; wearing it out is not.",
          "We inspect returns when they arrive. If an item comes back used, damaged or incomplete, we may refuse the refund or offer a partial one, and we will tell you why.",
        ],
      },
      {
        heading: "Starting a return",
        paragraphs: [
          "Write to support@kazimirazrafi.dev from the email address on the order, with the order number and the item you want to return. We will reply with the return address and a reference to put in the parcel.",
          "Pack the items securely and include the reference. Send us the tracking number when you post the parcel so a lost return can be traced.",
        ],
      },
      {
        heading: "Refunds",
        paragraphs: [
          "Once the return arrives and passes inspection, we refund the price you paid for the items to the original payment method. The refund is issued within fourteen days of the parcel arriving with us, and your bank may take a few more days to show it.",
          "The original shipping cost is refunded only when the whole order is returned, or when the return is our mistake.",
        ],
      },
      {
        heading: "Faulty, damaged or wrong items",
        paragraphs: [
          "If an item arrives damaged, faulty or is not what you ordered, tell us within thirty days with a photograph if you can. We pay the return postage in that case and refund the item and its share of the shipping in full, or send a replacement if it is still in stock.",
          "Faults that appear later are covered by the consumer law of your country; write to us and we will work through the remedy with you.",
        ],
      },
      {
        heading: "Items we cannot take back",
        paragraphs: [
          "For hygiene and safety reasons we cannot accept opened beauty products, used cosmetics, perishable groceries, or anything marked as final sale at the time of purchase. Gift cards cannot be returned for cash.",
          "If you are unsure whether an item can come back, ask us before you order.",
        ],
      },
      {
        heading: "Return shipping",
        paragraphs: [
          "Unless the item is faulty, damaged or wrong, you pay the cost of sending it back. We recommend a tracked service; a return that never arrives cannot be refunded.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "Any question about a return goes to support@kazimirazrafi.dev with the order number in the subject line. We answer within two business days.",
        ],
      },
    ],
  },
  {
    slug: "cookie-policy",
    title: "Cookie policy",
    description:
      "The cookies DevCart sets, what each one does, and how to remove them.",
    intro:
      "Cookies are small files a website stores in your browser. This store uses a few of them, all for the mechanics of shopping. There are no advertising or cross-site tracking cookies here.",
    sections: [
      {
        heading: "Why the store needs cookies",
        paragraphs: [
          "A web server does not remember you between requests. The cart you build, the account you sign into and the region you chose only survive because your browser sends a small identifier back with each request.",
          "Because these cookies are required for the store to work, they are set without a consent banner. If you block them, browsing and checkout will not function.",
        ],
      },
      {
        heading: "The cookies we set",
        list: [
          "Cart and session: an identifier that ties your cart to your browser. It lasts for about thirty days of inactivity and is removed when the cart is completed or expires.",
          "Authentication: a signed-in session token, set only after you sign in to your account. It expires when you sign out or after a period of inactivity.",
          "Region and country: the country code and currency you picked, so a page does not fall back to another region mid-visit.",
        ],
      },
      {
        heading: "Local storage",
        paragraphs: [
          "Your light, dark or automatic theme choice is kept in your browser's local storage under the name dc-theme. It never leaves your device, so the server does not know which theme you chose.",
        ],
      },
      {
        heading: "What we do not use",
        paragraphs: [
          "We do not set advertising cookies, we do not run cross-site trackers, and we do not embed third-party social widgets that would follow you. There is no analytics profile built from your visit.",
        ],
      },
      {
        heading: "Third parties",
        paragraphs: [
          "When card payment is enabled, the checkout loads Stripe's payment components. Stripe sets its own cookies and collects its own fraud signals under its privacy policy; we do not control those cookies. If you do not want them set, complete the order with another payment method where your region offers one.",
        ],
      },
      {
        heading: "Managing and removing cookies",
        paragraphs: [
          "Every browser lets you see and delete cookies, and most let you block them for a site. The settings live under Privacy or Security in your browser's preferences. Blocking the store's cookies will sign you out and empty your cart.",
          "To clear the theme preference, delete this site's local storage in the same settings.",
        ],
      },
      {
        heading: "Changes and contact",
        paragraphs: [
          "If the cookies this store uses change, this page is updated and the date at the top changes with it.",
          "Questions about cookies, or about the data we hold, go to support@kazimirazrafi.dev.",
        ],
      },
    ],
  },
  {
    slug: "shipping-and-delivery",
    title: "Shipping & delivery",
    description:
      "Despatch times, the delivery options DevCart offers, tracking, and what happens when a parcel goes missing.",
    intro:
      "Everything ships from our one warehouse. This page explains how quickly an order leaves, what the options are once it has, and what to do if something goes wrong on the way.",
    sections: [
      {
        heading: "Despatch time",
        paragraphs: [
          "Orders placed before the cutoff are picked and packed the next business day. Every order leaves within two business days of payment, and orders placed on a weekend or public holiday start counting on the next business day.",
          "If an item turns out to be unavailable after you order, we tell you within those two days and refund it.",
        ],
      },
      {
        heading: "Delivery options",
        paragraphs: [
          "Two options are offered at checkout, and the price for each is shown there in your region's currency before you pay.",
        ],
        list: [
          "Standard: expected two to three business days after despatch.",
          "Express: expected within twenty-four hours after despatch, on business days.",
        ],
      },
      {
        heading: "Tracking",
        paragraphs: [
          "A despatch email lists what left the warehouse and carries the courier's tracking number. You can also open the order from your account, where its status and tracking are shown.",
          "Tracking can take a few hours to register after the label is printed; a number that has not moved yet is not a lost parcel.",
        ],
      },
      {
        heading: "Addresses",
        paragraphs: [
          "Check the address at checkout and in the confirmation email. We can change an address only before the parcel is packed; after despatch the courier decides whether a redirect is possible.",
          "If a parcel is returned to us because the address was wrong or nobody collected it, we contact you to arrange redelivery. The original shipping cost is not refunded in that case.",
        ],
      },
      {
        heading: "Regions and customs",
        paragraphs: [
          "We deliver to the countries listed at checkout. If your country is not in the region menu, we do not currently ship there.",
          "For a delivery outside the store's home country, import duties or taxes may be charged by the destination country. Where the checkout does not collect them, they are the recipient's responsibility.",
        ],
      },
      {
        heading: "Lost or damaged parcels",
        paragraphs: [
          "If tracking has not moved for seven business days, or a parcel arrives damaged, write to support@kazimirazrafi.dev with the order number and photographs of the packaging. We open a claim with the courier and send a replacement or a refund once the claim is settled; you do not have to wait for the courier to finish before we tell you what happens next.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "Questions about a delivery go to support@kazimirazrafi.dev. Include the order number so we can find it without a second exchange. We answer within two business days.",
        ],
      },
    ],
  },
]

export const getLegalDocument = (slug: string) =>
  LEGAL_DOCUMENTS.find((document) => document.slug === slug)

export type { LegalLink }
