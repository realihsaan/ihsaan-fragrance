import Storefront from "../../components/storefront";

export const metadata = {
  title: "Shipping, Returns & 100% French Oil Guarantee",
  description:
    "Review Maison Ihsaan Ali's client commitments: complimentary nationwide courier delivery, 7-day hassle-free exchange policy, and 100% authentic French fragrance formulation guarantee.",
  alternates: {
    canonical: "/policies",
  },
};

export default function Policies() {
  return <Storefront kind="policies" />;
}
