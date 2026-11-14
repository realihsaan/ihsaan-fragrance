import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getDatabasePool } from "../../../../lib/server/db";

export const runtime = "nodejs";

const MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/avif": "avif",
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") || "").trim();

  if (!query) {
    return NextResponse.json({ error: "Enter an Order ID (e.g. IH90D7D9FD02) or Courier CN Number." }, { status: 400 });
  }

  const pool = getDatabasePool();
  try {
    const [rows] = await pool.execute(
      `SELECT o.id, o.public_id, o.status, o.payment_status, o.payment_method, o.total_cents, o.currency,
              o.customer_name, o.city, o.courier_name, o.courier_cn, o.remittance_reference,
              o.remittance_amount_cents, o.remitted_at, o.payment_verified_at, o.created_at
       FROM orders o
       WHERE o.public_id = ? OR o.courier_cn = ?
       LIMIT 1`,
      [query.toUpperCase(), query],
    );

    if (!rows.length) {
      return NextResponse.json({ error: `No order found matching “${query}”. Please check and try again.` }, { status: 404 });
    }

    const order = rows[0];
    return NextResponse.json({
      orderId: order.public_id,
      city: order.city,
      customerInitial: order.customer_name ? `${order.customer_name[0]}***` : "Customer",
      totalCents: order.total_cents,
      currency: order.currency || "pkr",
      status: order.status,
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      courierName: order.courier_name,
      courierCn: order.courier_cn,
      remittanceReference: order.remittance_reference,
      remittanceAmountCents: order.remittance_amount_cents,
      remittedAt: order.remitted_at,
      paymentVerifiedAt: order.payment_verified_at,
      createdAt: order.created_at,
    });
  } catch (error) {
    console.error("Courier remittance lookup error:", error);
    return NextResponse.json({ error: "Could not look up order remittance details." }, { status: 500 });
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim().toUpperCase() : "";
  const courierName = typeof body.courierName === "string" ? body.courierName.trim() : "Courier";
  const courierCn = typeof body.courierCn === "string" ? body.courierCn.trim() : "";
  const remittanceRef = typeof body.remittanceRef === "string" ? body.remittanceRef.trim() : "";
  const proofImageBase64 = typeof body.proofImage === "string" ? body.proofImage.trim() : "";
  const remittanceAmountCents = Number.isSafeInteger(body.remittanceAmountCents) ? body.remittanceAmountCents : null;

  if (!orderId || !/^IH[A-F0-9]{10}$/.test(orderId)) {
    return NextResponse.json({ error: "A valid Order ID (e.g. IH0123456789) is required." }, { status: 400 });
  }

  if (!remittanceRef && !proofImageBase64) {
    return NextResponse.json({ error: "Please provide either a Transaction/Remittance Reference or upload a Payment Slip Screenshot." }, { status: 400 });
  }

  let proofUrl = "";
  if (proofImageBase64.startsWith("data:image/")) {
    try {
      const match = proofImageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const ext = MIME_TO_EXT[mime] || "jpg";
        const buffer = Buffer.from(match[2], "base64");
        if (buffer.length > 8 * 1024 * 1024) {
          return NextResponse.json({ error: "Payment slip screenshot must be under 8MB." }, { status: 400 });
        }
        const fileName = `remit-${orderId.toLowerCase()}-${randomUUID()}.${ext}`;
        const uploadDir = join(process.cwd(), "public", "assets", "uploads");
        await mkdir(uploadDir, { recursive: true });
        await writeFile(join(uploadDir, fileName), buffer);
        proofUrl = `/assets/uploads/${fileName}`;
      }
    } catch (saveError) {
      console.error("Could not save remittance proof image:", saveError);
      return NextResponse.json({ error: "Failed to upload payment slip image." }, { status: 500 });
    }
  } else if (proofImageBase64.startsWith("/") || proofImageBase64.startsWith("http")) {
    proofUrl = proofImageBase64;
  }

  const pool = getDatabasePool();
  try {
    const [orders] = await pool.execute(
      "SELECT id, public_id, status, payment_status, total_cents FROM orders WHERE public_id = ? LIMIT 1",
      [orderId],
    );

    if (!orders.length) {
      return NextResponse.json({ error: `Order #${orderId} was not found.` }, { status: 404 });
    }

    const order = orders[0];
    const finalAmountCents = remittanceAmountCents || order.total_cents;

    await pool.execute(
      `UPDATE orders
       SET courier_name = COALESCE(?, courier_name),
           courier_cn = COALESCE(?, courier_cn),
           remittance_reference = ?,
           remittance_proof = COALESCE(?, remittance_proof),
           remittance_amount_cents = ?,
           remitted_at = NOW(),
           payment_status = 'submitted'
       WHERE id = ?`,
      [
        courierName || null,
        courierCn || null,
        remittanceRef || `Slip submitted on ${new Date().toLocaleDateString()}`,
        proofUrl || null,
        finalAmountCents,
        order.id,
      ],
    );

    return NextResponse.json({
      success: true,
      message: "Payment remittance slip submitted successfully! Our finance team will verify the payment.",
      orderId: order.public_id,
      paymentStatus: "submitted",
      remittanceRef,
      proofUrl,
    });
  } catch (error) {
    console.error("Error submitting courier remittance:", error);
    return NextResponse.json({ error: "Database error while recording remittance." }, { status: 500 });
  }
}
