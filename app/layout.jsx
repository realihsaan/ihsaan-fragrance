import "./globals.css";
import { StoreProvider } from "../components/store-context";
import { SiteChrome } from "../components/site-chrome";

export const metadata = {
  metadataBase: new URL("https://maisonihsaanali.com"),
  title: {
    default: "Maison Ihsaan Ali — Best Luxury Perfumes & Extrait De Parfum in Pakistan",
    template: "%s | Maison Ihsaan Ali — Haute Parfumerie",
  },
  description:
    "Experience Maison Ihsaan Ali, Pakistan's pinnacle haute parfumerie house. Hand-blended French concentrates, artisanal Extrait de Parfum & EDP. Shop the signature Velvet Smoke collection with complimentary nationwide delivery and Cash on Delivery (COD) across Karachi, Lahore, Islamabad, and all Pakistan.",
  keywords: [
    "Maison Ihsaan Ali",
    "Velvet Smoke perfume",
    "best perfume in Pakistan",
    "luxury perfumes Pakistan",
    "extrait de parfum Pakistan",
    "long lasting perfumes Pakistan",
    "niche fragrances Pakistan",
    "original French perfume Pakistan",
    "perfumes for men Lahore Karachi Islamabad",
    "perfumes for women Pakistan",
    "cash on delivery perfumes Pakistan",
    "buy perfumes online Pakistan",
    "best oud and amber perfumes Pakistan",
    "affordable luxury scents Pakistan",
    "handcrafted perfumes Pakistan",
  ],
  authors: [{ name: "Maison Ihsaan Ali", url: "https://maisonihsaanali.com" }],
  creator: "Maison Ihsaan Ali",
  publisher: "Maison Ihsaan Ali",
  category: "luxury fragrance",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    siteName: "Maison Ihsaan Ali",
    title: "Maison Ihsaan Ali — Best Luxury Perfumes & Extrait De Parfum in Pakistan",
    description:
      "Haute Parfumerie crafted with pure French concentrates. Discover the Velvet Smoke collection with complimentary nationwide delivery & Cash on Delivery across Pakistan.",
    url: "https://maisonihsaanali.com",
    locale: "en_PK",
    type: "website",
    images: [
      {
        url: "/assets/images/bottles-lineup.png",
        width: 1200,
        height: 630,
        alt: "Maison Ihsaan Ali Velvet Smoke Luxury Fragrance Collection",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Maison Ihsaan Ali — Best Luxury Perfumes in Pakistan",
    description:
      "Discover handcrafted French fragrances and Velvet Smoke Extrait de Parfum. Free shipping nationwide & Cash on Delivery.",
    images: ["/assets/images/bottles-lineup.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "PerfumeStore",
  name: "Maison Ihsaan Ali",
  url: "https://maisonihsaanali.com",
  logo: "https://maisonihsaanali.com/assets/images/logo-ring.png",
  image: "https://maisonihsaanali.com/assets/images/bottles-lineup.png",
  description:
    "Artisanal Haute Parfumerie house in Pakistan crafting high-concentration French perfumes including Velvet Smoke Extrait de Parfum.",
  priceRange: "PKR 2,900 - PKR 12,500",
  currenciesAccepted: "PKR",
  paymentAccepted: "Cash on Delivery, JazzCash, EasyPaisa, Direct Bank Transfer",
  areaServed: {
    "@type": "Country",
    name: "Pakistan",
  },
  address: {
    "@type": "PostalAddress",
    addressCountry: "PK",
    addressLocality: "Lahore",
    addressRegion: "Punjab",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    telephone: "+92-300-0000000",
    availableLanguage: ["English", "Urdu"],
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Maison Ihsaan Ali",
  url: "https://maisonihsaanali.com",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://maisonihsaanali.com/shop?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body>
        <StoreProvider>
          <SiteChrome>{children}</SiteChrome>
        </StoreProvider>
      </body>
    </html>
  );
}
