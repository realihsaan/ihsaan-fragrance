export const SHIPPING = { flat: 8, express: 18, freeOver: 150 };
export const COUPONS = { WELCOME10: 10, IHSAAN15: 15 };
export const STAGES = ["Order placed", "Packed", "Shipped", "Delivered"];
export const NOTES = {
  top: "Bergamot, Black Pepper, Cardamom",
  heart: "Orris, Jasmine, Cedarwood",
  base: "Amber, Sandalwood, Musk",
};

export const DEFAULT_CONTENT = {
  hero_image: { image: "/assets/images/hero-photo-full.png", alt: "Velvet Smoke bottle and box", video: "/assets/videos/hero_bg.mp4" },
  lifestyle_image: { image: "/assets/images/hero-photo-full.png", alt: "Velvet Smoke fragrance in a lifestyle setting", video: "/assets/videos/woman_used.mp4" },
  hero_copy: {
    eyebrow: "Fine fragrance for a more meaningful you",
    heading: "A signature begins with a scent.",
    body: "Velvet Smoke – a refined balance of warmth, spice, and quiet strength. Designed for every body.",
    button_text: "Discover Velvet Smoke",
    button_href: "/shop",
  },
  collection_copy: {
    eyebrow: "The collection",
    heading: "Velvet Smoke in Every Shade.",
    body: "A modern fragrance. Many expressions. Find yours.",
    button_text: "Shop all",
    button_href: "/shop",
  },
  lifestyle_copy: {
    eyebrow: "A moment, made yours",
    heading: "Wear a scent that stays with you.",
    body: "Find the fragrance that feels like your own, from the first spray to the last note.",
    button_text: "Find your fragrance",
    button_href: "/shop",
  },
};

export const PRODUCTS = [
  {
    id: "edp",
    type: "fragrance",
    name: "Velvet Smoke Eau de Parfum",
    short: "Eau de Parfum",
    price: 120,
    stock: 24,
    size: "50 ml",
    tag: "Warm. Spiced. Magnetic.",
    img: "/assets/images/product-eau-de-parfum.jpg",
    desc: "The classic Velvet Smoke. A warm, spiced heart over amber and sandalwood that settles close to the skin.",
  },
  {
    id: "edt",
    type: "fragrance",
    name: "Velvet Smoke Eau de Toilette",
    short: "Eau de Toilette",
    price: 120,
    stock: 3,
    size: "50 ml",
    tag: "Luminous. Elegant. Refined.",
    img: "/assets/images/product-eau-de-toilette.jpg",
    desc: "A lighter, brighter reading of Velvet Smoke. Bergamot and jasmine lead, made for daytime.",
  },
  {
    id: "ext",
    type: "fragrance",
    name: "Velvet Smoke Extrait de Parfum",
    short: "Extrait de Parfum",
    price: 140,
    stock: 12,
    size: "50 ml",
    tag: "Bold. Intense. Unforgettable.",
    img: "/assets/images/product-extrait-de-parfum.jpg",
    desc: "The deepest concentration. Amber, musk and sandalwood that stay with you well into the night.",
  },
];

export const CURRENCY = {
  code: process.env.NEXT_PUBLIC_STORE_CURRENCY || "PKR",
  symbol: process.env.NEXT_PUBLIC_STORE_CURRENCY_SYMBOL || "Rs. ",
};

export const productById = (id) => PRODUCTS.find((product) => product.id === id);

export const money = (amount) => {
  const num = Number(amount) || 0;
  const isPkr = CURRENCY.code.toUpperCase() === "PKR" || CURRENCY.symbol.includes("Rs");
  if (isPkr) {
    return `${CURRENCY.symbol}${num.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
  return `${CURRENCY.symbol}${(Math.round(num * 100) / 100).toFixed(num % 1 ? 2 : 0)}`;
};
