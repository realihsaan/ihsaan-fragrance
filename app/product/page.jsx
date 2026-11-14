import Storefront from "../../components/storefront";
import { notFound } from "next/navigation";
import { productById } from "../../components/catalog";

export async function generateMetadata({ searchParams }) {
  const { id } = await searchParams;
  const product = productById(id || "edp");
  if (!product) {
    return { title: "Velvet Smoke Luxury Fragrance" };
  }
  return {
    title: `${product.name} — Long Lasting Luxury Perfume in Pakistan`,
    description: `Buy ${product.name} (${product.size}). ${product.desc} Crafted with pure French fragrance concentrates. 12-14+ hours longevity. Free courier delivery & Cash on Delivery across Pakistan.`,
    alternates: {
      canonical: `/product?id=${product.id}`,
    },
    openGraph: {
      title: `${product.name} | Maison Ihsaan Ali`,
      description: product.desc,
      images: [{ url: product.img, width: 800, height: 800, alt: product.name }],
    },
  };
}

export default async function Product({ searchParams }) {
  const { id } = await searchParams;
  if (id === "box") notFound();
  return <Storefront kind="product" />;
}
