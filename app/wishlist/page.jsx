import Storefront from "../../components/storefront";

export const metadata = {
  title: "Your Saved Fragrance Wishlist | Maison Ihsaan Ali",
  description: "View and curate your favorite artisanal scents from the Maison Ihsaan Ali collection for future gifting or personal indulgence.",
};

export default function Wishlist() {
  return <Storefront kind="wishlist" />;
}
