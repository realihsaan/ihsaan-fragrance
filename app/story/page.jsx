import Storefront from "../../components/storefront";

export const metadata = {
  title: "Artisanal Craftsmanship & French Perfumery Heritage",
  description:
    "Discover the philosophy, artistry, and craftsmanship of Maison Ihsaan Ali. Hand-blended French extracts crafted for timeless elegance and distinction in Pakistan.",
  alternates: {
    canonical: "/story",
  },
};

export default function Story() {
  return <Storefront kind="story" />;
}
