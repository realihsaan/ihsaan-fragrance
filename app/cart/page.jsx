import Storefront from "../../components/storefront";

export const metadata = {
  title: "Your Fragrance Selection | Maison Ihsaan Ali",
  description: "Review your selected Maison Ihsaan Ali fragrances, complimentary presentation box, and proceed to secure checkout with Cash on Delivery or IBFT.",
};

export default function Cart() {
  return <Storefront kind="cart" />;
}
