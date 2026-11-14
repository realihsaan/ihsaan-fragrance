import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { authorizeAdmin } from "../../../lib/server/admin";
import { getDatabasePool } from "../../../lib/server/db";

export const runtime = "nodejs";

const CONTENT_KEYS = new Set([
  "hero_image", "hero_copy", "collection_copy", "lifestyle_image", "lifestyle_copy",
  "hero_leaves", "note_top", "note_heart", "note_base",
]);
const IMAGE_CONTENT_KEYS = new Set(["hero_image", "lifestyle_image", "hero_leaves", "note_top", "note_heart", "note_base"]);
const ORDER_STATUS_TRANSITIONS = {
  pending: "packed",
  paid: "packed",
  packed: "shipped",
  shipped: "delivered",
};
const REVENUE_STATUS_SQL = `(o.payment_status = 'paid') OR (o.status = 'delivered' AND o.payment_status != 'refunded')`;

function isValidImageReference(value) {
  if (typeof value !== "string" || value.length > 2048) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function responseForAuthorization(auth) {
  return auth.error ? NextResponse.json({ error: auth.error }, { status: auth.status }) : null;
}

function isValidProduct(product) {
  return product &&
    typeof product.id === "string" && /^[a-z0-9_-]{1,16}$/.test(product.id) &&
    ["fragrance", "set"].includes(product.type) &&
    typeof product.name === "string" && product.name.trim().length <= 255 && product.name.trim() &&
    typeof product.short === "string" && product.short.trim().length <= 120 && product.short.trim() &&
    typeof product.size === "string" && product.size.trim().length <= 80 && product.size.trim() &&
    typeof product.tag === "string" && product.tag.trim().length <= 255 && product.tag.trim() &&
    typeof product.desc === "string" && product.desc.trim().length <= 5000 && product.desc.trim() &&
    typeof product.pos === "string" && product.pos.trim().length <= 80 && product.pos.trim() &&
    isValidImageReference(product.img) && product.img.length <= 2048 &&
    Number.isFinite(product.price) && product.price >= 0.01 && product.price <= 100000 &&
    Number.isSafeInteger(product.stock) && product.stock >= 0 && product.stock <= 100000;
}

function mapProduct(product) {
  return {
    id: product.id,
    type: product.type,
    name: product.name,
    short: product.short,
    price: Number(product.price),
    stock: product.stock,
    size: product.size,
    tag: product.tag,
    img: product.img,
    desc: product.description ?? product.desc,
    pos: product.image_position ?? product.pos,
  };
}

export async function GET() {
  try {
    const auth = await authorizeAdmin();
    const denied = responseForAuthorization(auth);
    if (denied) return denied;

    const pool = getDatabasePool();
    const [[products], [inventory], [content], [allReviews], [orderCounts], [orders], [productSales]] = await Promise.all([
      pool.query("SELECT * FROM store_products ORDER BY id"),
      pool.query("SELECT product_id, stock FROM inventory"),
      pool.query("SELECT content_key, image_url, alt_text FROM storefront_content ORDER BY content_key"),
      pool.query(
        `SELECT r.id, r.product_id, r.customer_id, r.customer_name, r.review_text,
                r.rating, r.verified_purchase, r.created_at, r.status, u.email AS customer_email
         FROM product_reviews r
         LEFT JOIN users u ON u.id = r.customer_id
         ORDER BY r.created_at DESC LIMIT 200`,
      ),
      pool.query(
        `SELECT COUNT(*) AS total_orders,
                COALESCE(SUM(o.status = 'pending'), 0) AS pending_orders,
                COALESCE(SUM(o.status = 'delivered'), 0) AS delivered_orders,
                COALESCE(SUM(o.payment_method = 'cash_on_delivery' AND o.payment_status = 'pending'), 0) AS pending_cod_orders,
                COALESCE(SUM(o.payment_status = 'submitted'), 0) AS review_payment_orders,
                COALESCE(SUM(o.payment_status = 'paid'), 0) AS paid_payment_orders,
                COALESCE(SUM((o.payment_status = 'paid')
                  OR (o.payment_method = 'cash_on_delivery' AND o.status = 'delivered')), 0) AS revenue_orders,
                COALESCE(SUM(CASE WHEN (${REVENUE_STATUS_SQL}) THEN o.total_cents ELSE 0 END), 0) AS revenue_cents,
                COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_cents ELSE 0 END), 0) AS delivered_revenue_cents
         FROM orders o`,
      ),
      pool.query(
        `SELECT o.id, o.public_id, COALESCE(NULLIF(u.full_name, ''), o.customer_name) AS customer_name,
                COALESCE(u.email, o.email) AS email, COALESCE(NULLIF(o.phone, ''), u.phone) AS phone,
                o.has_whatsapp, o.whatsapp_number,
                o.address_line1, o.address_line2,
                city, region, postal_code, country, subtotal_cents, discount_cents,
                shipping_cents, total_cents, currency, status, payment_status, payment_method,
                o.payment_reference, o.payment_proof,
                o.courier_name, o.courier_cn, o.remittance_reference, o.remittance_proof,
                o.remittance_amount_cents, o.remitted_at, o.payment_verified_at, o.payment_verified_by,
                o.created_at
         FROM orders o
         LEFT JOIN users u ON u.id = o.customer_id
         ORDER BY o.created_at DESC
         LIMIT 100`,
      ),
      pool.query(
        `SELECT p.id AS product_id, p.name AS product_name,
                COUNT(DISTINCT CASE
                  WHEN o.status NOT IN ('refunded', 'inventory_issue') THEN o.id
                END) AS order_count,
                COALESCE(SUM(CASE
                  WHEN o.status NOT IN ('refunded', 'inventory_issue') THEN oi.quantity
                  ELSE 0
                END), 0) AS units_ordered,
                COALESCE(SUM(CASE
                  WHEN o.status = 'delivered' THEN oi.quantity
                  ELSE 0
                END), 0) AS units_delivered,
                COALESCE(SUM(CASE WHEN (${REVENUE_STATUS_SQL}) THEN oi.total_cents ELSE 0 END), 0) AS revenue_cents
         FROM store_products p
         LEFT JOIN order_items oi ON oi.product_id = p.id
         LEFT JOIN orders o ON o.id = oi.order_id
         GROUP BY p.id, p.name
         ORDER BY revenue_cents DESC, units_ordered DESC, p.name`,
      ),
    ]);

    let orderItems = [];
    let statusHistory = [];
    if (orders.length) {
      const placeholders = orders.map(() => "?").join(",");
      const ids = orders.map((order) => order.id);
      [orderItems, statusHistory] = await Promise.all([
        pool.execute(
          `SELECT oi.order_id, oi.product_id, COALESCE(p.name, oi.product_id) AS product_name,
                  oi.quantity, oi.unit_price_cents, oi.total_cents
           FROM order_items oi
           LEFT JOIN store_products p ON p.id = oi.product_id
           WHERE oi.order_id IN (${placeholders})
           ORDER BY oi.id`,
          ids,
        ).then(([rows]) => rows),
        pool.execute(
          `SELECT h.order_id, h.status, h.created_at, u.full_name AS changed_by
           FROM order_status_history h
           LEFT JOIN users u ON u.id = h.changed_by
           WHERE h.order_id IN (${placeholders})
           ORDER BY h.created_at, h.id`,
          ids,
        ).then(([rows]) => rows),
      ]);
    }

    const itemsByOrder = new Map();
    const historyByOrder = new Map();
    for (const event of statusHistory) {
      const history = historyByOrder.get(event.order_id) || [];
      history.push({ status: event.status, created_at: event.created_at, changed_by: event.changed_by });
      historyByOrder.set(event.order_id, history);
    }
    for (const item of orderItems) {
      const items = itemsByOrder.get(item.order_id) || [];
      items.push({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price_cents: item.unit_price_cents,
        total_cents: item.total_cents,
      });
      itemsByOrder.set(item.order_id, items);
    }

    const stockById = new Map(inventory.map((item) => [item.product_id, item.stock]));
    const pendingReviews = allReviews.filter((r) => r.status === "pending");
    const approvedReviews = allReviews.filter((r) => r.status === "approved");
    return NextResponse.json({
      products: products.map((product) => mapProduct({ ...product, stock: stockById.get(product.id) || 0 })),
      content,
      pendingReviews,
      approvedReviews,
      allReviews,
      orderCount: Number(orderCounts[0]?.total_orders || 0),
      pendingOrderCount: Number(orderCounts[0]?.pending_orders || 0),
      deliveredOrderCount: Number(orderCounts[0]?.delivered_orders || 0),
      pendingCodOrdersCount: Number(orderCounts[0]?.pending_cod_orders || 0),
      reviewPaymentOrdersCount: Number(orderCounts[0]?.review_payment_orders || 0),
      paidPaymentOrdersCount: Number(orderCounts[0]?.paid_payment_orders || 0),
      revenueOrders: Number(orderCounts[0]?.revenue_orders || 0),
      revenueCents: Number(orderCounts[0]?.revenue_cents || 0),
      deliveredRevenueCents: Number(orderCounts[0]?.delivered_revenue_cents || 0),
      productSales: productSales.map((sale) => ({
        ...sale,
        order_count: Number(sale.order_count),
        units_ordered: Number(sale.units_ordered),
        units_delivered: Number(sale.units_delivered),
        revenue_cents: Number(sale.revenue_cents),
      })),
      orders: orders.map((order) => ({
        ...order,
        items: itemsByOrder.get(order.id) || [],
        status_history: historyByOrder.get(order.id) || [],
      })),
    });
  } catch (error) {
    console.error("Could not load admin data:", error);
    return NextResponse.json({ error: "Admin data could not be loaded. Check the local MySQL setup." }, { status: 503 });
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  try {
    const auth = await authorizeAdmin();
    const denied = responseForAuthorization(auth);
    if (denied) return denied;

    const product = body?.product;
    if (!product || !["fragrance", "set"].includes(product.type) ||
      typeof product.name !== "string" || product.name.trim().length < 1 || product.name.length > 255 ||
      typeof product.short !== "string" || product.short.trim().length < 1 || product.short.length > 120 ||
      typeof product.size !== "string" || product.size.trim().length < 1 || product.size.length > 80 ||
      typeof product.tag !== "string" || product.tag.trim().length < 1 || product.tag.length > 255 ||
      typeof product.desc !== "string" || product.desc.trim().length < 1 || product.desc.length > 5000 ||
      typeof product.pos !== "string" || product.pos.trim().length < 1 || product.pos.length > 80 ||
      !isValidImageReference(product.img) || product.img.length > 2048 ||
      !Number.isFinite(product.price) || product.price < 0.01 || product.price > 100000 ||
      !Number.isSafeInteger(product.stock) || product.stock < 0 || product.stock > 100000) {
      return NextResponse.json({ error: "Complete all product details with a valid price, stock and image URL." }, { status: 400 });
    }

    const id = `p${randomUUID().replaceAll("-", "").slice(0, 15)}`;
    const pool = getDatabasePool();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO store_products
         (id, type, name, short, price, size, tag, img, description, image_position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, product.type, product.name.trim(), product.short.trim(), product.price,
          product.size.trim(), product.tag.trim(), product.img.trim(), product.desc.trim(), product.pos.trim(),
        ],
      );
      await connection.execute("INSERT INTO inventory (product_id, stock) VALUES (?, ?)", [id, product.stock]);
      await connection.commit();
      return NextResponse.json({ created: true, product: mapProduct({ ...product, id }) }, { status: 201 });
    } catch (error) {
      await connection.rollback();
      if (error.code === "ER_DUP_ENTRY") {
        return NextResponse.json({ error: "A product ID conflict occurred. Please try adding it again." }, { status: 409 });
      }
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Could not create product:", error);
    return NextResponse.json({ error: "Product could not be created. Check the local MySQL setup." }, { status: 503 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await authorizeAdmin();
    const denied = responseForAuthorization(auth);
    if (denied) return denied;

    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[a-z0-9_-]{1,16}$/.test(id)) {
      return NextResponse.json({ error: "Choose a valid product." }, { status: 400 });
    }

    const connection = await getDatabasePool().getConnection();
    try {
      await connection.beginTransaction();
      const [inventory] = await connection.execute(
        "SELECT product_id FROM inventory WHERE product_id = ? FOR UPDATE",
        [id],
      );
      if (!inventory.length) {
        await connection.rollback();
        return NextResponse.json({ error: "This product no longer exists." }, { status: 404 });
      }
      const [orders] = await connection.execute(
        "SELECT 1 FROM order_items WHERE product_id = ? LIMIT 1",
        [id],
      );
      const [reviews] = await connection.execute(
        "SELECT 1 FROM product_reviews WHERE product_id = ? LIMIT 1",
        [id],
      );
      if (orders.length || reviews.length) {
        await connection.rollback();
        return NextResponse.json(
          { error: "This product has order or review history and can’t be deleted. Set its stock to 0 to stop new sales while keeping customer records intact." },
          { status: 409 },
        );
      }
      await connection.execute("DELETE FROM store_products WHERE id = ?", [id]);
      await connection.commit();
      return NextResponse.json({ deleted: true });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Could not delete product:", error);
    return NextResponse.json({ error: "Product could not be deleted. Check the local MySQL setup." }, { status: 503 });
  }
}

export async function PATCH(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  try {
    const auth = await authorizeAdmin();
    const denied = responseForAuthorization(auth);
    if (denied) return denied;
    const { type } = body || {};
    const pool = getDatabasePool();

    if (type === "product-image") {
      const { productId, img } = body;
      if (typeof productId !== "string" || !/^[a-z0-9_-]{1,16}$/.test(productId) || !isValidImageReference(img)) {
        return NextResponse.json({ error: "Product image details are invalid." }, { status: 400 });
      }
      const [products] = await pool.execute("SELECT id FROM store_products WHERE id = ? LIMIT 1", [productId]);
      if (!products.length) return NextResponse.json({ error: "This product no longer exists." }, { status: 404 });
      await pool.execute("UPDATE store_products SET img = ? WHERE id = ?", [img.trim(), productId]);
      return NextResponse.json({ saved: true });
    }

    if (type === "order") {
      const { orderId, status } = body;
      const VALID_STATUSES = new Set(["pending", "paid", "packed", "shipped", "delivered", "refunded", "inventory_issue"]);
      if (typeof orderId !== "string" || !/^IH[A-F0-9]{10}$/.test(orderId) || !VALID_STATUSES.has(status)) {
        return NextResponse.json({ error: "Order status update details are invalid." }, { status: 400 });
      }
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [currentRows] = await connection.execute(
          "SELECT id, status FROM orders WHERE public_id = ? FOR UPDATE",
          [orderId],
        );
        if (!currentRows.length) {
          await connection.rollback();
          return NextResponse.json({ error: "This order could not be found." }, { status: 404 });
        }
        const currentStatus = currentRows[0].status;
        if (currentStatus !== status) {
          await connection.execute(
            "UPDATE orders SET status = ? WHERE id = ?",
            [status, currentRows[0].id],
          );
          await connection.execute(
            "INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, ?, ?)",
            [currentRows[0].id, status, auth.user.id],
          );
        }
        await connection.commit();
        return NextResponse.json({ saved: true, orderId, previousStatus: currentStatus, status });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    if (type === "order-whatsapp") {
      const { orderId, hasWhatsapp, whatsappNumber } = body;
      if (typeof orderId !== "string" || !/^IH[A-F0-9]{10}$/.test(orderId)) {
        return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
      }
      await pool.execute(
        "UPDATE orders SET has_whatsapp = ?, whatsapp_number = ? WHERE public_id = ?",
        [hasWhatsapp ? 1 : 0, whatsappNumber ? whatsappNumber.trim() : null, orderId],
      );
      return NextResponse.json({ saved: true, orderId, hasWhatsapp: Boolean(hasWhatsapp), whatsappNumber });
    }

    if (type === "order-courier") {
      const { orderId, courierName, courierCn } = body;
      if (typeof orderId !== "string" || !/^IH[A-F0-9]{10}$/.test(orderId)) {
        return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
      }
      await pool.execute(
        "UPDATE orders SET courier_name = ?, courier_cn = ? WHERE public_id = ?",
        [courierName ? String(courierName).trim() : null, courierCn ? String(courierCn).trim() : null, orderId],
      );
      return NextResponse.json({ saved: true, orderId, courierName, courierCn });
    }

    if (type === "order-payment-status") {
      const { orderId, paymentStatus } = body;
      const VALID_PAYMENT_STATUSES = new Set(["pending", "submitted", "paid", "refunded"]);
      if (typeof orderId !== "string" || !/^IH[A-F0-9]{10}$/.test(orderId) || !VALID_PAYMENT_STATUSES.has(paymentStatus)) {
        return NextResponse.json({ error: "Invalid payment status details." }, { status: 400 });
      }
      const isPaid = paymentStatus === "paid";
      const verifierName = auth.user?.user_metadata?.full_name || auth.user?.email || "Admin";
      await pool.execute(
        `UPDATE orders
         SET payment_status = ?,
             payment_verified_at = CASE WHEN ? = 1 THEN NOW() ELSE payment_verified_at END,
             payment_verified_by = CASE WHEN ? = 1 THEN ? ELSE payment_verified_by END
         WHERE public_id = ?`,
        [paymentStatus, isPaid ? 1 : 0, isPaid ? 1 : 0, verifierName, orderId],
      );
      return NextResponse.json({
        saved: true,
        orderId,
        paymentStatus,
        paymentVerifiedAt: isPaid ? new Date().toISOString() : null,
        paymentVerifiedBy: isPaid ? verifierName : null,
      });
    }

    if (type === "order-remittance") {
      const { orderId, courierName, courierCn, remittanceRef, remittanceProof, remittanceAmountCents, markAsPaid } = body;
      if (typeof orderId !== "string" || !/^IH[A-F0-9]{10}$/.test(orderId)) {
        return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
      }
      const newPaymentStatus = markAsPaid ? "paid" : "submitted";
      const verifierName = auth.user?.user_metadata?.full_name || auth.user?.email || "Admin";
      await pool.execute(
        `UPDATE orders
         SET courier_name = COALESCE(?, courier_name),
             courier_cn = COALESCE(?, courier_cn),
             remittance_reference = ?,
             remittance_proof = COALESCE(?, remittance_proof),
             remittance_amount_cents = COALESCE(?, remittance_amount_cents),
             remitted_at = NOW(),
             payment_status = ?,
             payment_verified_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END,
             payment_verified_by = CASE WHEN ? = 1 THEN ? ELSE NULL END
         WHERE public_id = ?`,
        [
          courierName ? String(courierName).trim() : null,
          courierCn ? String(courierCn).trim() : null,
          remittanceRef ? String(remittanceRef).trim() : null,
          remittanceProof || null,
          Number.isSafeInteger(remittanceAmountCents) ? remittanceAmountCents : null,
          newPaymentStatus,
          markAsPaid ? 1 : 0,
          markAsPaid ? verifierName : null,
          orderId,
        ],
      );
      return NextResponse.json({
        saved: true,
        orderId,
        paymentStatus: newPaymentStatus,
        remittanceRef,
        remittanceProof,
        remittanceAmountCents,
        courierName,
        courierCn,
        paymentVerifiedBy: markAsPaid ? verifierName : null,
      });
    }

    if (type === "product") {
      const { product } = body;
      if (!isValidProduct(product)) {
        return NextResponse.json({ error: "Product details are invalid." }, { status: 400 });
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await connection.execute(
          `UPDATE store_products
           SET type = ?, name = ?, short = ?, price = ?, size = ?, tag = ?, img = ?, description = ?, image_position = ?
           WHERE id = ?`,
          [
            product.type, product.name.trim(), product.short.trim(), product.price, product.size.trim(),
            product.tag.trim(), product.img.trim(), product.desc.trim(), product.pos.trim(), product.id,
          ],
        );
        const [result] = await connection.execute(
          `INSERT INTO inventory (product_id, stock) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE stock = VALUES(stock)`,
          [product.id, product.stock],
        );
        await connection.commit();
        return NextResponse.json({ saved: true, changed: result.affectedRows >= 0 });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    if (type === "content") {
      const { section } = body;
      if (!section || !CONTENT_KEYS.has(section.content_key)) {
        return NextResponse.json({ error: "Choose a valid storefront section." }, { status: 400 });
      }
      const imageUrl = typeof section.image_url === "string" ? section.image_url.trim() : "";
      const videoUrl = typeof section.video_url === "string" ? section.video_url.trim() : "";
      const altText = typeof section.alt_text === "string" ? section.alt_text.trim() : "";
      const eyebrow = typeof section.eyebrow_text === "string" ? section.eyebrow_text.trim() : "";
      const heading = typeof section.heading_text === "string" ? section.heading_text.trim() : "";
      const bodyText = typeof section.body_text === "string" ? section.body_text.trim() : "";
      const buttonText = typeof section.button_text === "string" ? section.button_text.trim() : "";
      const buttonHref = typeof section.button_href === "string" ? section.button_href.trim() : "";
      if ((IMAGE_CONTENT_KEYS.has(section.content_key) && !isValidImageReference(imageUrl)) ||
        (!IMAGE_CONTENT_KEYS.has(section.content_key) &&
          (!heading || !bodyText || !buttonText || !/^\/(?!\/)/.test(buttonHref))) ||
        (videoUrl && !isValidImageReference(videoUrl)) ||
        imageUrl.length > 2048 || videoUrl.length > 2048 || altText.length > 300 ||
        eyebrow.length > 255 || heading.length > 500 || bodyText.length > 5000 ||
        buttonText.length > 120 || buttonHref.length > 2048) {
        return NextResponse.json({ error: "Storefront section details are invalid. Use a valid local path or HTTPS URL." }, { status: 400 });
      }
      await pool.execute(
        `INSERT INTO storefront_content
         (content_key, image_url, video_url, alt_text, eyebrow_text, heading_text, body_text, button_text, button_href)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE image_url = VALUES(image_url), video_url = VALUES(video_url),
         alt_text = VALUES(alt_text), eyebrow_text = VALUES(eyebrow_text), heading_text = VALUES(heading_text),
         body_text = VALUES(body_text), button_text = VALUES(button_text), button_href = VALUES(button_href)`,
        [section.content_key, imageUrl, videoUrl, altText, eyebrow, heading, bodyText, buttonText, buttonHref],
      );
      return NextResponse.json({ saved: true });
    }

    if (type === "review") {
      const { reviewId, status } = body;
      if (typeof reviewId !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reviewId) ||
          !["approved", "rejected", "pending"].includes(status)) {
        return NextResponse.json({ error: "Review moderation details are invalid." }, { status: 400 });
      }
      const [result] = await pool.execute(
        "UPDATE product_reviews SET status = ? WHERE id = ?",
        [status, reviewId],
      );
      if (result.affectedRows === 0) return NextResponse.json({ error: "Review could not be found." }, { status: 404 });
      return NextResponse.json({ saved: true });
    }

    if (type === "create_review") {
      const { productId, customerName, rating, reviewText, verifiedPurchase, status } = body;
      if (!productId || typeof customerName !== "string" || !customerName.trim() ||
          typeof reviewText !== "string" || !reviewText.trim()) {
        return NextResponse.json({ error: "Product ID, customer name, and review text are required." }, { status: 400 });
      }
      const starRating = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));
      const reviewId = randomUUID();
      await pool.execute(
        `INSERT INTO product_reviews
         (id, product_id, customer_id, customer_name, review_text, rating, verified_purchase, status)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?)`,
        [
          reviewId,
          productId,
          customerName.trim().slice(0, 80),
          reviewText.trim().slice(0, 2000),
          starRating,
          verifiedPurchase !== false,
          status === "pending" ? "pending" : "approved",
        ],
      );
      return NextResponse.json({ saved: true, reviewId });
    }

    if (type === "delete_review") {
      const { reviewId } = body;
      if (typeof reviewId !== "string" ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reviewId)) {
        return NextResponse.json({ error: "Valid review ID required." }, { status: 400 });
      }
      await pool.execute("DELETE FROM product_reviews WHERE id = ?", [reviewId]);
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Admin update type is invalid." }, { status: 400 });
  } catch (error) {
    console.error("Could not save admin changes:", error);
    return NextResponse.json({ error: "Changes could not be saved. Check the local MySQL setup and try again." }, { status: 503 });
  }
}
