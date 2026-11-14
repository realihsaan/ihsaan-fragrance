import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDatabasePool } from "../../../lib/server/db";
import { getCurrentUser } from "../../../lib/server/session";

export const runtime = "nodejs";

function isValidProductId(value) {
  return typeof value === "string" && /^[a-z0-9_-]{1,16}$/.test(value);
}

export async function GET(request) {
  const productId = new URL(request.url).searchParams.get("productId");
  if (!isValidProductId(productId)) {
    return NextResponse.json({ error: "Choose a valid product." }, { status: 400 });
  }

  try {
    const [products] = await getDatabasePool().execute("SELECT id FROM store_products WHERE id = ? LIMIT 1", [productId]);
    if (!products.length) return NextResponse.json({ error: "Choose an available product." }, { status: 404 });
    const [data] = await getDatabasePool().execute(
      `SELECT id, customer_name, review_text, rating, verified_purchase, created_at
       FROM product_reviews
       WHERE product_id = ? AND status = 'approved'
       ORDER BY created_at DESC
       LIMIT 100`,
      [productId],
    );

    return NextResponse.json({ reviews: data.map((review) => ({
        id: review.id,
        name: review.customer_name,
        text: review.review_text,
        stars: review.rating,
        verifiedPurchase: Boolean(review.verified_purchase),
        date: review.created_at,
      })) });
  } catch (error) {
    console.error("Could not load product reviews:", error);
    return NextResponse.json({ error: "Reviews are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const productId = body?.productId;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const stars = body?.stars;
  if (!isValidProductId(productId) ||
      text.length < 1 || text.length > 2000 || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "Enter a review up to 2,000 characters and a 1–5 star rating." }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "customer") {
      return NextResponse.json({ error: "Sign in to your customer account before submitting a review." }, { status: 401 });
    }

    const [products] = await getDatabasePool().execute("SELECT id FROM store_products WHERE id = ? LIMIT 1", [productId]);
    if (!products.length) return NextResponse.json({ error: "Choose an available product." }, { status: 404 });

    const name = user.user_metadata.full_name.trim() || user.email.split("@")[0];
    const [purchaseRows] = await getDatabasePool().execute(
      `SELECT 1
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.customer_id = ? AND oi.product_id = ?
         AND o.status IN ('paid', 'packed', 'shipped', 'delivered')
       LIMIT 1`,
      [user.id, productId],
    );
    const verifiedPurchase = purchaseRows.length > 0;
    await getDatabasePool().execute(
      `INSERT INTO product_reviews
       (id, product_id, customer_id, customer_name, review_text, rating, verified_purchase)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), productId, user.id, name.slice(0, 80), text, stars, verifiedPurchase],
    );

    return NextResponse.json({ submitted: true, message: "Thanks! Your review will appear after admin approval." }, { status: 201 });
  } catch (error) {
    console.error("Could not submit product review:", error);
    return NextResponse.json({ error: "Your review could not be submitted. Check that the local MySQL database is running." }, { status: 503 });
  }
}
