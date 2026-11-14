import Storefront from "../../components/storefront";

export const metadata = {
  title: "Secure Checkout & Cash on Delivery | Maison Ihsaan Ali Pakistan",
  description: "Complete your order with Maison Ihsaan Ali. Enjoy complimentary nationwide courier shipping with Cash on Delivery (COD) or Direct Bank Transfer.",
};

export default function Checkout() {
  return <Storefront kind="checkout" />;
}
