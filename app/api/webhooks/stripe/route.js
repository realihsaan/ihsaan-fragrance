import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabasePool } from "../../../../lib/server/db";
import { getStripe } from "../../../../lib/server/stripe";

export const runtime = "nodejs";

async function savePaidOrder(session) {
  if (session.payment_status !== "paid") return;

  const stripe = getStripe();
  const [fullSession, lineItems] = await Promise.all([
    stripe.checkout.sessions.retrieve(session.id),
    stripe.checkout.sessions.listLineItems(session.id, { limit: 100, expand: ["data.price.product"] }),
  ]);
  const shippingDetails = fullSession.collected_information?.shipping_details || fullSession.shipping_details;
  const address = shippingDetails?.address || {};
  const email = fullSession.customer_details?.email || fullSession.customer_email;
  if (!email || !lineItems.data.length) throw new Error("Paid Checkout session is missing customer or product details.");

  const items = lineItems.data.map((line) => {
    const productId = line.price?.product?.metadata?.product_id;
    if (!productId || !Number.isSafeInteger(line.quantity) || !line.price?.unit_amount) {
      throw new Error("Paid Checkout session contains an invalid product line.");
    }
    return {
      productId,
      quantity: line.quantity,
      unitPrice: line.price.unit_amount,
      subtotal: line.amount_subtotal,
      total: line.amount_total,
    };
  });

  const pool = getDatabasePool();
  const connection = await pool.getConnection();
  let orderId;
  let inventoryAvailable = true;
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute(
      "SELECT id, status FROM orders WHERE stripe_session_id = ? FOR UPDATE",
      [fullSession.id],
    );
    if (existing.length) {
      await connection.commit();
      orderId = existing[0].id;
      inventoryAvailable = existing[0].status !== "inventory_issue";
    } else {
      const productIds = [...new Set(items.map((item) => item.productId))];
      const placeholders = productIds.map(() => "?").join(",");
      const [inventory] = await connection.execute(
        `SELECT product_id, stock FROM inventory WHERE product_id IN (${placeholders}) FOR UPDATE`,
        productIds,
      );
      const stockById = new Map(inventory.map((row) => [row.product_id, row.stock]));
      const requiredById = new Map();
      for (const item of items) {
        requiredById.set(item.productId, (requiredById.get(item.productId) || 0) + item.quantity);
      }
      inventoryAvailable = [...requiredById].every(([productId, quantity]) => (stockById.get(productId) || 0) >= quantity);

      orderId = randomUUID();
      const publicId = `IH${randomBytes(5).toString("hex").toUpperCase()}`;
      const paymentIntentId = typeof fullSession.payment_intent === "string"
        ? fullSession.payment_intent
        : fullSession.payment_intent?.id || null;
      await connection.execute(
        `INSERT INTO orders (
          id, public_id, stripe_session_id, stripe_payment_intent_id, customer_id,
          email, customer_name, phone, address_line1, address_line2, city, region,
          postal_code, country, subtotal_cents, discount_cents, shipping_cents, total_cents, currency,
          status, payment_status, payment_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'stripe')`,
        [
          orderId, publicId, fullSession.id, paymentIntentId, fullSession.metadata?.customer_id || null,
          email.toLowerCase(), shippingDetails?.name || fullSession.customer_details?.name || "",
          fullSession.customer_details?.phone || fullSession.metadata?.contact_phone || "", address.line1 || "", address.line2 || "",
          address.city || "", address.state || "", address.postal_code || "", address.country || "",
          fullSession.amount_subtotal,
          Math.max(0, fullSession.amount_subtotal + (fullSession.shipping_cost?.amount_total || 0) - fullSession.amount_total),
          fullSession.shipping_cost?.amount_total || 0, fullSession.amount_total,
          fullSession.currency, inventoryAvailable ? "paid" : "inventory_issue",
        ],
      );
      await connection.execute(
        "INSERT INTO order_status_history (order_id, status) VALUES (?, ?)",
        [orderId, inventoryAvailable ? "paid" : "inventory_issue"],
      );
      for (const item of items) {
        await connection.execute(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents, subtotal_cents, total_cents)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.productId, item.quantity, item.unitPrice, item.subtotal, item.total],
        );
        if (inventoryAvailable) {
          await connection.execute(
            "UPDATE inventory SET stock = stock - ? WHERE product_id = ? AND stock >= ?",
            [item.quantity, item.productId, item.quantity],
          );
        }
      }
      await connection.commit();
    }
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      const [rows] = await pool.execute(
        "SELECT id, status FROM orders WHERE stripe_session_id = ? LIMIT 1",
        [fullSession.id],
      );
      if (rows.length) {
        orderId = rows[0].id;
        inventoryAvailable = rows[0].status !== "inventory_issue";
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  } finally {
    connection.release();
  }

  if (inventoryAvailable) return;
  const paymentIntentId = typeof fullSession.payment_intent === "string"
    ? fullSession.payment_intent
    : fullSession.payment_intent?.id;
  if (!paymentIntentId) throw new Error("Cannot refund an inventory-short order without a payment intent.");
  await stripe.refunds.create(
    { payment_intent: paymentIntentId },
    { idempotencyKey: `inventory-refund-${fullSession.id}` },
  );
  await pool.execute("UPDATE orders SET status = 'refunded' WHERE id = ? AND status = 'inventory_issue'", [orderId]);
}

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook endpoint is not configured." }, { status: 400 });
  }

  let event;
  try {
    const rawBody = await request.text();
    event = getStripe().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error.message);
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (
    (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") &&
    event.data.object.payment_status === "paid"
  ) {
    try {
      await savePaidOrder(event.data.object);
    } catch (error) {
      console.error(`Could not persist paid Stripe session ${event.data.object.id}:`, error);
      return NextResponse.json({ error: "Order processing failed; Stripe should retry this webhook." }, { status: 500 });
    }
  }

  if (event.type === "charge.refunded") {
    const paymentIntentId = event.data.object.payment_intent;
    if (typeof paymentIntentId === "string") {
      try {
        await getDatabasePool().execute(
          "UPDATE orders SET status = 'refunded' WHERE stripe_payment_intent_id = ?",
          [paymentIntentId],
        );
      } catch (error) {
        console.error(`Could not update refunded order for payment ${paymentIntentId}:`, error);
        return NextResponse.json({ error: "Refund status update failed; Stripe should retry this webhook." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
