import Storefront from "../../components/storefront";

export const metadata = {
  title: "Live Order Tracking & Courier Status in Pakistan",
  description:
    "Track your Maison Ihsaan Ali order in real-time. Enter your tracking ID or registered email to monitor packing, dispatch, courier transit, and delivery status across Pakistan.",
  alternates: {
    canonical: "/track",
  },
};

export default function Track() {
  return <Storefront kind="track" />;
}
