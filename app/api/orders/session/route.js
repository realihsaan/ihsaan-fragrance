import { NextResponse } from "next/server";
import { getDatabasePool } from "../../../../lib/server/db";
import { getStripe } from "../../../../lib/server/stripe";

export const runtime = "nodejs";

export async function GET(request) {
  const sessionId = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_(test_|live_)[A-Za-z0-9]+$/.test(sessionId)) {
    return NextResponse.json({ error: "A valid Checkout session is required." }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment has not been confirmed." }, { status: 402 });
    }

    const [rows] = await getDatabasePool().execute(
      `SELECT o.id, o.public_id, o.status, o.total_cents, o.currency, o.created_at,
              i.product_id, i.quantity, i.unit_price_cents, i.total_cents AS item_total_cents
       FROM orders o
       LEFT JOIN order_items i ON i.order_id = o.id
       WHERE o.stripe_session_id = ?
       ORDER BY i.id`,
      [sessionId],
    );
    if (!rows.length) return NextResponse.json({ pending: true }, { status: 202 });
    const first = rows[0];
    const [statusHistory] = await getDatabasePool().execute(
      `SELECT status, created_at
       FROM order_status_history
       WHERE order_id = ?
       ORDER BY created_at, id`,
      [first.id],
    );
    return NextResponse.json({
      id: first.public_id,
      status: first.status,
      total: first.total_cents,
      currency: first.currency,
      createdAt: first.created_at,
      items: rows.filter((row) => row.product_id).map((row) => ({
        product_id: row.product_id,
        quantity: row.quantity,
        unit_price_cents: row.unit_price_cents,
        total_cents: row.item_total_cents,
      })),
      statusHistory,
    });
  } catch (error) {
    console.error("Could not load paid order:", error);
    return NextResponse.json({ error: "We couldn’t load this order yet." }, { status: 503 });
  }
}
