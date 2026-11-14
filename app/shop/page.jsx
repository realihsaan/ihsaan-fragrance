import Storefront from "../../components/storefront";

export const metadata = {
  title: "Shop Luxury Perfumes & Extrait De Parfum in Pakistan",
  description:
    "Explore the complete Maison Ihsaan Ali luxury fragrance collection. Hand-crafted Extrait de Parfum, Eau de Parfum, and EDT featuring pure French floral and amber absolutes. Free nationwide delivery & Cash on Delivery across Pakistan.",
  alternates: {
    canonical: "/shop",
  },
};

export default function Shop() {
  return <Storefront kind="shop" />;
}
