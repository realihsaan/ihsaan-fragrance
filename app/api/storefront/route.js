import { NextResponse } from "next/server";
import { DEFAULT_CONTENT } from "../../../components/catalog";
import { getDatabasePool } from "../../../lib/server/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const pool = getDatabasePool();
    const [[products], [inventory], [content]] = await Promise.all([
      pool.query("SELECT * FROM store_products ORDER BY id"),
      pool.query("SELECT product_id, stock FROM inventory"),
      pool.query("SELECT content_key, image_url, video_url, alt_text, eyebrow_text, heading_text, body_text, button_text, button_href FROM storefront_content"),
    ]);

    const stockById = new Map(inventory.map((item) => [item.product_id, item.stock]));
    const productList = products.map((product) => ({
      id: product.id,
      type: product.type,
      name: product.name,
      short: product.short,
      price: Number(product.price),
      stock: stockById.get(product.id) || 0,
      size: product.size,
      tag: product.tag,
      img: product.img,
      desc: product.description,
      pos: product.image_position,
    }));
    const contentMap = Object.fromEntries(content.map((item) => [item.content_key, {
      image: item.image_url,
      video: item.video_url,
      alt: item.alt_text,
      eyebrow: item.eyebrow_text,
      heading: item.heading_text,
      body: item.body_text,
      button_text: item.button_text,
      button_href: item.button_href,
    }]));

    return NextResponse.json({
      products: productList,
      content: { ...DEFAULT_CONTENT, ...contentMap },
      configured: true,
    });
  } catch (error) {
    console.error("Could not load storefront content:", error);
    return NextResponse.json({ error: "Storefront content is unavailable. Run npm run db:setup and confirm MySQL is running." }, { status: 503 });
  }
}
