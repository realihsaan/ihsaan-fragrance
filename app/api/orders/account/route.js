import { NextResponse } from "next/server";
import { getDatabasePool } from "../../../../lib/server/db";
import { getCurrentUser } from "../../../../lib/server/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "customer") return NextResponse.json({ error: "Sign in to your customer account to view your orders." }, { status: 401 });

    const [rows] = await getDatabasePool().execute(
      `SELECT o.id, o.public_id, o.status, o.total_cents, o.currency, o.created_at,
              i.product_id, i.quantity, i.unit_price_cents, i.total_cents AS item_total_cents
       FROM orders o
       LEFT JOIN order_items i ON i.order_id = o.id
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC
       LIMIT 250`,
      [user.id],
    );
    const orderIds = [...new Set(rows.map((row) => row.id))];
    let historyRows = [];
    if (orderIds.length) {
       const placeholders = orderIds.map(() => "?").join(",");
       [historyRows] = await getDatabasePool().execute(
         `SELECT order_id, status, created_at
          FROM order_status_history
          WHERE order_id IN (${placeholders})
          ORDER BY created_at, id`,
         orderIds,
       );
    }

    const ordersById = new Map();
    const historyByOrderId = new Map();
    for (const event of historyRows) {
       const history = historyByOrderId.get(event.order_id) || [];
       history.push({ status: event.status, createdAt: event.created_at });
       historyByOrderId.set(event.order_id, history);
    }
    for (const row of rows) {
       let order = ordersById.get(row.public_id);
       if (!order) {
         order = {
           id: row.public_id,
          status: row.status,
          total: row.total_cents,
          currency: row.currency,
          createdAt: row.created_at,
          items: [],
          statusHistory: historyByOrderId.get(row.id) || [],
        };
        ordersById.set(row.public_id, order);
      }
      if (row.product_id) {
        order.items.push({
          product_id: row.product_id,
          quantity: row.quantity,
          unit_price_cents: row.unit_price_cents,
          total_cents: row.item_total_cents,
        });
      }
    }

    return NextResponse.json({ orders: [...ordersById.values()] });
  } catch (error) {
    console.error("Could not load customer orders:", error);
    return NextResponse.json({ error: "We couldn’t load your orders. Please try again." }, { status: 503 });
  }
}
