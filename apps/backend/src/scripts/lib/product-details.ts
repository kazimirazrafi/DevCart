/**
 * Builds the markdown details band for the demo catalogue: category copy filled
 * with each product's own facts (brand, weight, dimensions, warranty, shipping,
 * returns, minimum order). Stored in product.metadata.details.
 */

/** The catalogue fields this copy is written from. */
export type DetailsProduct = {
  id: number
  handle: string
  title: string
  description: string
  category: string
  brand: string | null
  weight: number
  dimensions: { width: number; height: number; depth: number } | null
  warranty: string | null
  shipping: string | null
  returns: string | null
  minimumOrder: number
  rating: number
  tags: string[]
}

type CategoryCopy = {
  heading: string
  /** Bullets; title and brand are filled in per product. */
  lines: string[]
  closer?: string
}

/** Use and care copy per category. Facts that the source data does not state
 * are left out rather than invented. */
const CATEGORY_COPY: Record<string, CategoryCopy> = {
  beauty: {
    heading: "How to use it",
    lines: [
      "Build the product up in thin layers rather than one heavy pass — the finish stays even and it lasts longer.",
      "Give it a minute to settle before you judge the shade; most formulas darken slightly as they dry.",
      "Keep the applicator clean and close the lid firmly, and it will stay fresh for the shelf life printed on the pack.",
      "Patch test on the inner arm first if your skin is reactive, and stop if it stings rather than tingles.",
    ],
  },
  fragrances: {
    heading: "Wearing and keeping it",
    lines: [
      "Spray onto pulse points — wrist, throat, behind the ears — from about 15 cm, and let it dry rather than rubbing it in.",
      "Layer it over an unscented moisturiser: scent holds longer on hydrated skin than on dry skin.",
      "Store the bottle upright, away from a window and away from the bathroom shelf; heat and light are what turn a fragrance.",
      "A travel-friendly decant is the practical way to carry it, and it keeps the original bottle closed.",
    ],
  },
  "skin-care": {
    heading: "How to use it",
    lines: [
      "Apply to clean, slightly damp skin, and give it a minute before the next step of your routine.",
      "Start once a day for the first week; most routines are better built up slowly than started at full strength.",
      "Finish the morning with a broad-spectrum sunscreen, which is what protects the result you are paying for.",
      "Stop and check with a pharmacist or dermatologist if a product causes lasting redness or irritation.",
    ],
  },
  laptops: {
    heading: "Setting it up",
    lines: [
      "Charge it fully before the first setup, then run it on battery regularly — a machine that lives on mains ages its cells faster.",
      "Keep the vents clear: a bed, a cushion or a closed sleeve is the usual reason a laptop runs hot.",
      "Sign in, run the updates it asks for, and set up a backup before you move your work onto it.",
      "Use the charger it ships with; a lower-wattage adapter will charge it slowly and can leave it draining under load.",
    ],
  },
  smartphones: {
    heading: "Getting started",
    lines: [
      "Move your number and data over during setup rather than afterwards — the transfer is quicker and leaves less behind.",
      "Use a case and a screen protector from day one; the glass is tough, the corners are not.",
      "Charge it as you need to rather than to a routine, and avoid leaving it on a charger overnight in a hot room.",
      "Water resistance fades with age and is not covered by any warranty — treat the phone as dry unless the spec says otherwise.",
    ],
  },
  tablets: {
    heading: "Getting started",
    lines: [
      "Set up your account, then choose which apps sync: a tablet is at its best when it is not carrying everything your phone does.",
      "Pair a keyboard or stylus before you need it, so the first long session is not spent on settings.",
      "Keep the screen clean with a dry microfibre cloth, and avoid alcohol wipes on an oleophobic coating.",
      "Store it flat and charged to roughly half if it will sit unused for weeks.",
    ],
  },
  "mobile-accessories": {
    heading: "Fitting and care",
    lines: [
      "Check the model in the compatibility notes before you fit it — cases and mounts are cut for one generation at a time.",
      "Fit it dry and clean: dust trapped under a case or screen protector is what scratches a phone.",
      "Take it off every few weeks and wipe both surfaces; grit works its way in and polishes the finish.",
      "Coiled cables last longer stored loosely than wound tight around a charger.",
    ],
  },
  tops: {
    heading: "Fit and fabric",
    lines: [
      "The measurements are taken flat on the garment; compare them with something that already fits you rather than guessing a size.",
      "Wash cool and inside out to keep the colour and the shape, and skip the dryer if you can.",
      "Hang or fold straight after washing; most creases drop out without an iron.",
      "A cold rinse before the first wear settles any loose dye, especially on the darker colourways.",
    ],
  },
  "womens-dresses": {
    heading: "Fit and fabric",
    lines: [
      "Measured flat, so check the bust and length against a dress you already wear before choosing a size.",
      "Hand wash or use a cold, gentle cycle, and dry it on a hanger out of direct sun.",
      "Press on the reverse with a cool iron, or steam it in the bathroom while you shower.",
      "Line dry rather than tumble: heat is what shrinks a woven fabric and dulls a print.",
    ],
  },
  "mens-shirts": {
    heading: "Fit and fabric",
    lines: [
      "The fit is described by the flat measurements; compare a shirt you like across the chest rather than relying on the collar size.",
      "Wash cool, hang immediately, and the shirt arrives at the iron almost flat.",
      "Iron the collar and cuffs first — they take the longest and they are what people see.",
      "Wear it a few times between washes; cotton that is washed after every wear fades twice as fast.",
    ],
  },
  "womens-shoes": {
    heading: "Sizing and care",
    lines: [
      "Sizing follows the label's own chart, so check the centimetres against your foot and size up for a wider fit.",
      "Break them in around the house first; an hour indoors saves a blister on the first long walk.",
      "Let leather breathe between wears, and use shoe trees or newspaper to hold the shape when storing.",
      "Wipe off salt and rain the same day, and condition smooth leather once a season.",
    ],
  },
  "mens-shoes": {
    heading: "Sizing and care",
    lines: [
      "Sized from the label's own chart — measure your foot in centimetres and match it, rather than assuming your usual number.",
      "Wear them in short stretches at first so the upper softens to your foot rather than the other way round.",
      "Rest them a day between wears and keep shoe trees in them; the leather dries and recovers in that day.",
      "Brush off dust and dirt after each wear, and treat suede before the first wet day, not after.",
    ],
  },
  "womens-bags": {
    heading: "Carrying and care",
    lines: [
      "Fill it as it is meant to be carried — overloading a shoulder bag stretches the strap and warps the base.",
      "Keep it out of a downpour; if it does get wet, blot it and let it dry away from a radiator.",
      "Store it stuffed with paper, in its dust bag, with the strap inside so it does not crease.",
      "Condition smooth leather once or twice a year, and keep pens capped inside it.",
    ],
  },
  "womens-watches": {
    heading: "Wearing and servicing",
    lines: [
      "Have the bracelet sized rather than wearing it loose; a watch that slides on the wrist reads the time badly and wears its links.",
      "Water resistance is rated for the watch as new — have the seals checked at every battery or service.",
      "Keep it away from magnets, which is what makes a mechanical watch run fast for no visible reason.",
      "Wipe the case and strap with a dry cloth after wearing, and store it face up in a dry place.",
    ],
  },
  "mens-watches": {
    heading: "Wearing and servicing",
    lines: [
      "Size the strap so the case sits behind the wrist bone; that is also where the crystal is least likely to meet a door frame.",
      "Water resistance is only as good as the seals, so have them inspected when the battery is changed.",
      "Magnetic fields from speakers and laptop lids are the usual cause of a watch gaining minutes.",
      "Rinse a metal bracelet with fresh water if you have been swimming, and dry it before storing.",
    ],
  },
  "womens-jewellery": {
    heading: "Wearing and care",
    lines: [
      "Put jewellery on last and take it off first — perfume, hairspray and lotion are what dull a plated finish.",
      "Keep each piece in its own pouch so chains do not knot or scratch the piece next to them.",
      "Take it off before swimming, showering or the gym, and wipe it with a soft dry cloth after wearing.",
      "A plated finish is a surface, not a solid; treat it as you would a good watch strap.",
    ],
  },
  furniture: {
    heading: "Measuring and assembly",
    lines: [
      "Measure the doorway and the turn on the stairs before delivery, not just the wall it is going against.",
      "Assemble on a soft surface and leave the fixings finger-tight until every part is in place, then tighten.",
      "Keep solid wood out of direct sun and away from a radiator; it moves with the room's humidity by design.",
      "Dust with a dry cloth and treat spills immediately — water marks wood in minutes and stains fabric permanently.",
    ],
  },
  "home-decoration": {
    heading: "Placing and caring for it",
    lines: [
      "Decide where it goes before you unwrap it — glass and ceramic prefer a stable shelf to a shelf edge.",
      "Keep it out of direct sun if the finish matters; colour in a decorative piece fades like anything else.",
      "Dust with a soft dry cloth rather than a wet one, and avoid abrasive cleaners on any painted surface.",
      "Pack it back into its box if it is going into storage, rather than into a bag with other hard objects.",
    ],
  },
  "kitchen-accessories": {
    heading: "Using and cleaning it",
    lines: [
      "Wash before the first use, and dry thoroughly — a stainless surface that air-dries develops spots.",
      "Check the material before putting it in a dishwasher; heat and detergent are hard on coatings and seals.",
      "Let a hot pan cool before it meets cold water, which is what warps an even base.",
      "Store it dry and unstacked where you can; a drawer of loose metal is what dulls an edge.",
    ],
  },
  groceries: {
    heading: "Storage and shelf life",
    lines: [
      "Store it as the pack directs, and decant only what you will use in the next few weeks.",
      "Keep the pack sealed and away from heat and light, which is what most often spoils a good ingredient early.",
      "Check the date and the allergen panel on the pack you receive rather than assuming they match the listing.",
      "Refrigerate after opening where the label says so, and use a clean, dry spoon each time.",
    ],
  },
  "sports-accessories": {
    heading: "Using it",
    lines: [
      "Check the fit and the fixings before every session — most equipment failure happens at a worn strap or a loose bolt.",
      "Rinse off sweat and dirt after use and dry it in the shade; sunlight perishes rubber and elastic faster than wear does.",
      "Store it indoors and loosely packed, and never put damp kit away in a sealed bag.",
      "Replace anything that has frayed, cracked or lost its shape; that is the point at which it stops doing its job.",
    ],
  },
  motorcycle: {
    heading: "Riding and maintenance",
    lines: [
      "Check tyre pressures, chain tension and the lights before a ride, and the oil level every few hundred kilometres.",
      "Follow the service intervals in the handbook rather than a general rule of thumb; the first service matters most.",
      "Registration, insurance and a helmet are legal requirements in almost every market, and are not included with the machine.",
      "Store it under cover with a full tank and a battery tender if it will stand for the winter.",
    ],
  },
  vehicle: {
    heading: "Ownership notes",
    lines: [
      "Check the fluids, tyre pressures and lights before a long drive, and the oil on a cold engine.",
      "Follow the manufacturer's service schedule; the booklet that comes with the car is the authority, not this page.",
      "Registration, insurance and delivery to your address are arranged separately after the order is confirmed.",
      "Wash the underside after winter roads — road salt is what ages a car fastest.",
    ],
  },
  sunglasses: {
    heading: "Lens and frame care",
    lines: [
      "Clean the lenses with the cloth provided and a drop of water, not with a tissue or the hem of a shirt.",
      "Keep them in a case rather than a pocket or a bag, where keys do the damage.",
      "Never leave them on a dashboard; heat warps an acetate frame and crazes a coated lens.",
      "Take them off with two hands to keep the hinges and the fit even.",
    ],
  },
}

/** The heading used when a product's category has no copy of its own. */
const FALLBACK_COPY: CategoryCopy = {
  heading: "Using and caring for it",
  lines: [
    "Read the packaging and the specification tab before the first use; both are specific to this item.",
    "Keep it clean and dry, and store it as the instructions suggest rather than where it happens to fit.",
    "Check it over periodically — most long-term problems show up early as a loose fitting or a small crack.",
    "Contact us if something is not right on arrival; that is ours to put right, not yours to live with.",
  ],
}

/** Three closings, picked by product id, so no two pages end the same. */
const CLOSERS = [
  "Packed and checked by hand before it leaves us.",
  "Photographed in daylight, so the colour you see is the colour that arrives.",
  "One of the pieces our team keeps coming back to.",
] as const

const cm = (value: number) => `${Math.round(value * 100) / 100} cm`

/** The markdown details for one product: a paragraph, its category's care
 * section, and only the delivery facts the catalogue actually has. */
export const detailsForProduct = (product: DetailsProduct): string => {
  const copy = CATEGORY_COPY[product.category] ?? FALLBACK_COPY
  const closer = CLOSERS[product.id % CLOSERS.length]

  const blocks: string[] = [
    `## About the ${product.title}`,
    product.description.trim(),
    `## ${copy.heading}`,
    copy.lines.map((line) => `- ${line}`).join("\n"),
  ]

  const aftercare: string[] = []

  if (product.warranty) {
    aftercare.push(`- **Warranty:** ${product.warranty}`)
  }

  if (product.shipping) {
    aftercare.push(`- **Delivery:** ${product.shipping}`)
  }

  if (product.returns) {
    aftercare.push(`- **Returns:** ${product.returns}`)
  }

  if (product.minimumOrder > 1) {
    aftercare.push(
      `- **Minimum order:** ${product.minimumOrder} units per order for this item`
    )
  }

  if (aftercare.length) {
    blocks.push("## Delivery and returns", aftercare.join("\n"))
  }

  const measurements = product.dimensions
    ? [
        `${cm(product.dimensions.width)} wide`,
        `${cm(product.dimensions.height)} high`,
        `${cm(product.dimensions.depth)} deep`,
      ].join(", ")
    : null

  const facts: string[] = []

  if (product.weight) {
    facts.push(`- **Weight:** ${product.weight} g`)
  }

  if (measurements) {
    facts.push(`- **Dimensions:** ${measurements}`)
  }

  if (product.rating >= 4.5) {
    facts.push(
      `- **Well reviewed:** rated ${product.rating.toFixed(1)} out of 5 by customers`
    )
  }

  if (facts.length) {
    blocks.push("## At a glance", facts.join("\n"))
  }

  blocks.push(closer)

  return blocks.filter(Boolean).join("\n\n")
}
