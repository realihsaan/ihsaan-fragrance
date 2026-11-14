import { NextResponse } from "next/server";
import { getDatabasePool } from "../../../../lib/server/db";
import { getCurrentUser } from "../../../../lib/server/session";

export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Order lookup details are invalid." }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  let orderId = typeof body.orderId === "string" ? body.orderId.trim().toUpperCase() : "";
  let email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  // Smart detect query parameter
  if (query) {
    if (query.includes("@")) {
      email = query.toLowerCase();
      orderId = "";
    } else if (/^IH[A-F0-9]{10}$/i.test(query) || (query.toUpperCase().startsWith("IH") && query.length >= 8)) {
      orderId = query.toUpperCase();
    } else {
      orderId = query.toUpperCase();
    }
  }

  try {
    const user = await getCurrentUser();
    if (!email && !orderId && user && user.role === "customer" && user.email) {
      email = user.email.toLowerCase();
    }

    if (!orderId && !email) {
      return NextResponse.json({
        error: "Please enter your tracking number (e.g. IH0123456789) or your email address.",
      }, { status: 400 });
    }

    const pool = getDatabasePool();
    let orders = [];

    if (orderId && !email) {
      // Look up by Order ID alone
      const [orderRows] = await pool.execute(
        `SELECT o.id, o.public_id, o.status, o.payment_status, o.total_cents, o.currency, o.payment_method, o.payment_reference,
                o.courier_name, o.courier_cn, o.customer_name, o.email, o.address_line1, o.city, o.created_at
         FROM orders o
         WHERE o.public_id = ?
         LIMIT 1`,
        [orderId],
      );
      orders = orderRows;
    } else if (orderId && email) {
      // Look up by Order ID + Email
      const [orderRows] = await pool.execute(
        `SELECT o.id, o.public_id, o.status, o.payment_status, o.total_cents, o.currency, o.payment_method, o.payment_reference,
                o.courier_name, o.courier_cn, o.customer_name, o.email, o.address_line1, o.city, o.created_at
         FROM orders o
         WHERE o.public_id = ? AND LOWER(o.email) = ?
         LIMIT 1`,
        [orderId, email],
      );
      // Fallback: if email didn't match exactly, check if orderId exists alone
      if (!orderRows.length) {
        const [fallbackRows] = await pool.execute(
          `SELECT o.id, o.public_id, o.status, o.payment_status, o.total_cents, o.currency, o.payment_method, o.payment_reference,
                  o.courier_name, o.courier_cn, o.customer_name, o.email, o.address_line1, o.city, o.created_at
           FROM orders o
           WHERE o.public_id = ?
           LIMIT 1`,
          [orderId],
        );
        orders = fallbackRows;
      } else {
        orders = orderRows;
      }
    } else {
      // Look up all orders by Email alone
      const [orderRows] = await pool.execute(
        `SELECT o.id, o.public_id, o.status, o.payment_status, o.total_cents, o.currency, o.payment_method, o.payment_reference,
                o.courier_name, o.courier_cn, o.customer_name, o.email, o.address_line1, o.city, o.created_at
         FROM orders o
         WHERE LOWER(o.email) = ?
         ORDER BY o.created_at DESC
         LIMIT 25`,
        [email],
      );
      orders = orderRows;
    }

    if (!orders.length) {
      if (email && !orderId) {
        return NextResponse.json({
          error: `No orders found for “${email}”. Please check your email address or enter your tracking number.`,
        }, { status: 404 });
      }
      return NextResponse.json({
        error: `No order found for “${orderId || query}”. Please check your tracking number and try again.`,
      }, { status: 404 });
    }

    const orderInternalIds = orders.map((o) => o.id);
    const placeholders = orderInternalIds.map(() => "?").join(",");

    const [[itemRows], [historyRows]] = await Promise.all([
      pool.execute(
        `SELECT oi.order_id, oi.product_id, COALESCE(p.name, oi.product_id) AS product_name,
                COALESCE(p.img, '') AS product_img, COALESCE(p.short, '') AS product_short,
                oi.quantity, oi.unit_price_cents, oi.total_cents
         FROM order_items oi
         LEFT JOIN store_products p ON p.id = oi.product_id
         WHERE oi.order_id IN (${placeholders})
         ORDER BY oi.id ASC`,
        orderInternalIds,
      ),
      pool.execute(
        `SELECT h.order_id, h.status, h.created_at
         FROM order_status_history h
         WHERE h.order_id IN (${placeholders})
         ORDER BY h.created_at ASC, h.id ASC`,
        orderInternalIds,
      ),
    ]);

    const itemsByOrder = new Map();
    for (const item of itemRows) {
      const list = itemsByOrder.get(item.order_id) || [];
      list.push({
        product_id: item.product_id,
        product_name: item.product_name,
        product_img: item.product_img,
        product_short: item.product_short,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        total_cents: item.total_cents,
      });
      itemsByOrder.set(item.order_id, list);
    }

    const historyByOrder = new Map();
    for (const h of historyRows) {
      const list = historyByOrder.get(h.order_id) || [];
      list.push({
        status: h.status,
        created_at: h.created_at,
      });
      historyByOrder.set(h.order_id, list);
    }

    const formattedOrders = orders.map((o) => ({
      id: o.public_id,
      status: o.status,
      paymentStatus: o.payment_status || "pending",
      total: o.total_cents,
      currency: o.currency || "pkr",
      paymentMethod: o.payment_method,
      paymentReference: o.payment_reference,
      courierName: o.courier_name,
      courierCn: o.courier_cn,
      customerName: o.customer_name,
      email: o.email,
      address: [o.address_line1, o.city].filter(Boolean).join(", "),
      createdAt: o.created_at,
      items: itemsByOrder.get(o.id) || [],
      statusHistory: historyByOrder.get(o.id) || [],
    }));

    const primaryOrder = formattedOrders[0];

    return NextResponse.json({
      mode: email && !orderId ? "email" : "order",
      email: email || primaryOrder.email,
      searchedId: orderId,
      totalOrdersFound: formattedOrders.length,
      orders: formattedOrders,
      // Backward compatibility fields for single order:
      id: primaryOrder.id,
      status: primaryOrder.status,
      paymentStatus: primaryOrder.paymentStatus,
      paymentMethod: primaryOrder.paymentMethod,
      paymentReference: primaryOrder.paymentReference,
      courierName: primaryOrder.courierName,
      courierCn: primaryOrder.courierCn,
      total: primaryOrder.total,
      currency: primaryOrder.currency,
      createdAt: primaryOrder.createdAt,
      items: primaryOrder.items,
      statusHistory: primaryOrder.statusHistory,
    });
  } catch (error) {
    console.error("Could not look up order:", error);
    return NextResponse.json({ error: "We couldn’t look up this order. Please try again." }, { status: 503 });
  }
}
