import Storefront from "../../components/storefront";

export const metadata = {
  title: "Client Concierge & Fragrance Consultation",
  description:
    "Connect with the Maison Ihsaan Ali private concierge. Personalized perfume consultations, bespoke gifting inquiries, order support, and FAQs.",
  alternates: {
    canonical: "/contact",
  },
};

export default function Contact() {
  return <Storefront kind="contact" />;
}
