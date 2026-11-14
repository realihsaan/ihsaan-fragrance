import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { COUPONS, SHIPPING, money } from "../../../components/catalog";
import { getDatabasePool } from "../../../lib/server/db";
import { sendOrderConfirmationEmail } from "../../../lib/server/email";
import { getBankDetails, processEasyPaisaPayment, processJazzCashPayment } from "../../../lib/server/payments";
import { getCurrentUser } from "../../../lib/server/session";
import { getAllowedShippingCountries, getAppUrl, getStripe } from "../../../lib/server/stripe";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ORDER_QUANTITY = 20;
const VALID_PAYMENT_METHODS = ["cash_on_delivery", "bank_transfer", "jazzcash", "easypaisa", "stripe"];

export async function GET() {
  return NextResponse.json({
    cardPaymentsAvailable: Boolean(process.env.STRIPE_SECRET_KEY),
    bankTransferAvailable: true,
    jazzcashAvailable: true,
    easypaisaAvailable: true,
    bankDetails: getBankDetails(),
  });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Checkout details are invalid." }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) {
    return NextResponse.json({ error: "Your cart is empty or invalid." }, { status: 400 });
  }

  const requested = new Map();
  for (const item of body.items) {
    if (!item || typeof item.id !== "string" || !/^[a-z0-9_-]{1,16}$/.test(item.id) ||
      !Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      return NextResponse.json({ error: "One or more cart quantities are invalid." }, { status: 400 });
    }
    requested.set(item.id, (requested.get(item.id) || 0) + item.quantity);
  }
  if ([...requested.values()].reduce((sum, quantity) => sum + quantity, 0) > MAX_ORDER_QUANTITY) {
    return NextResponse.json({ error: `Orders are limited to ${MAX_ORDER_QUANTITY} items.` }, { status: 400 });
  }

  const paymentMethod = body.paymentMethod || "cash_on_delivery";
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    return NextResponse.json({ error: "Choose a valid payment method." }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    const isCustomer = user && user.role === "customer";

    let email = "";
    let customerName = "";
    let phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const hasWhatsapp = body.hasWhatsapp !== false && body.hasWhatsapp !== "false";
    const rawWhatsappNumber = typeof body.whatsappNumber === "string" ? body.whatsappNumber.trim() : "";
    const whatsappNumber = hasWhatsapp ? (rawWhatsappNumber || phone) : "";

    if (isCustomer) {
      email = user.email.toLowerCase();
      customerName = (user.user_metadata?.full_name || "").trim();
      if (!customerName && typeof body.name === "string") {
        customerName = body.name.trim();
      }
      if (phone.length >= 7) {
        await getDatabasePool().execute("UPDATE users SET phone = ? WHERE id = ?", [phone, user.id]);
      }
    } else {
      // Guest Checkout
      email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      customerName = typeof body.name === "string" ? body.name.trim() : "";
    }

    if (!EMAIL.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address for order confirmation." }, { status: 400 });
    }
    if (customerName.length < 2 || customerName.length > 120) {
      return NextResponse.json({ error: "Enter your full name for delivery." }, { status: 400 });
    }
    if (phone.length < 7 || phone.length > 50) {
      return NextResponse.json({ error: "Enter a valid phone number for delivery updates." }, { status: 400 });
    }

    const ids = [...requested.keys()];
    const placeholders = ids.map(() => "?").join(",");
    const [products] = await getDatabasePool().execute(
      `SELECT p.id, p.name, p.price, p.size, i.stock
       FROM store_products p JOIN inventory i ON i.product_id = p.id
       WHERE p.id IN (${placeholders})`,
      ids,
    );
    const productById = new Map(products.map((product) => [product.id, product]));
    for (const [id, quantity] of requested) {
      if (!productById.has(id) || quantity > productById.get(id).stock) {
        return NextResponse.json({ error: "A product is unavailable or the requested quantity exceeds current stock." }, { status: 409 });
      }
    }

    // Stripe checkout flow
    if (paymentMethod === "stripe") {
      if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: "Card payments are not configured. Choose Cash on Delivery, Bank Transfer, or Mobile Wallet." }, { status: 503 });
      }
      const lineItems = [...requested].map(([id, quantity]) => {
        const product = productById.get(id);
        return {
          quantity,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(Number(product.price) * 100),
            product_data: {
              name: product.name,
              description: product.size,
              metadata: { product_id: id },
            },
          },
        };
      });
      const subtotalCents = lineItems.reduce((sum, item) => sum + item.price_data.unit_amount * item.quantity, 0);
      const shippingCents = subtotalCents >= SHIPPING.freeOver * 100 ? 0 : SHIPPING.flat * 100;
      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: email,
        line_items: lineItems,
        allow_promotion_codes: true,
        billing_address_collection: "required",
        shipping_address_collection: { allowed_countries: getAllowedShippingCountries() },
        phone_number_collection: { enabled: true },
        shipping_options: [{
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: shippingCents, currency: "usd" },
            display_name: shippingCents ? "Standard delivery" : "Free standard delivery",
          },
        }],
        success_url: `${getAppUrl()}/order?session_id={CHECKOUT_SESSION_ID}&new=1`,
        cancel_url: `${getAppUrl()}/checkout?cancelled=1`,
        metadata: {
          source: "maison-ihsaan-ali-storefront",
          customer_id: isCustomer ? user.id : "",
          customer_name: customerName,
          contact_phone: phone,
        },
      });
      if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
      return NextResponse.json({ url: session.url });
    }

    // Address verification for local orders
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const address2 = typeof body.address2 === "string" ? body.address2.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const region = typeof body.region === "string" ? body.region.trim() : "";
    const postalCode = typeof body.postalCode === "string" ? body.postalCode.trim() : "";
    const country = typeof body.country === "string" ? body.country.trim() : "Pakistan";

    if (address.length < 5 || address.length > 255 || address2.length > 255 ||
      city.length < 2 || city.length > 120 || country.length < 2 || country.length > 80) {
      return NextResponse.json({ error: "Enter your complete delivery address and city." }, { status: 400 });
    }

    const coupon = typeof body.coupon === "string" ? body.coupon.trim().toUpperCase() : "";
    if (coupon && !COUPONS[coupon]) {
      return NextResponse.json({ error: "This discount code is not valid." }, { status: 400 });
    }

    const pool = getDatabasePool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [lockedProducts] = await connection.execute(
        `SELECT p.id, p.name, p.short, p.price, p.size, p.img, i.stock
         FROM store_products p JOIN inventory i ON i.product_id = p.id
         WHERE p.id IN (${placeholders}) FOR UPDATE`,
        ids,
      );
      const lockedById = new Map(lockedProducts.map((product) => [product.id, product]));
      for (const [id, quantity] of requested) {
        if (!lockedById.has(id) || quantity > lockedById.get(id).stock) {
          await connection.rollback();
          return NextResponse.json({ error: "A product is unavailable or the requested quantity exceeds current stock." }, { status: 409 });
        }
      }

      const itemRows = [...requested].map(([id, quantity]) => {
        const product = lockedById.get(id);
        const unitPriceCents = Math.round(Number(product.price) * 100);
        return {
          id,
          name: product.name,
          short: product.short || "",
          size: product.size || "",
          img: product.img || "",
          quantity,
          unitPriceCents,
          lineCents: unitPriceCents * quantity,
        };
      });

      const rawSubtotal = itemRows.reduce((sum, item) => sum + item.lineCents, 0);
      const discount = coupon ? Math.round(rawSubtotal * COUPONS[coupon] / 100) : 0;
      const subtotalCents = rawSubtotal - discount;
      let discountAllocated = 0;
      for (const [index, item] of itemRows.entries()) {
        item.discountCents = index === itemRows.length - 1
          ? discount - discountAllocated
          : Math.floor(discount * item.lineCents / rawSubtotal);
        discountAllocated += item.discountCents;
        item.totalCents = item.lineCents - item.discountCents;
      }
      const shippingCents = subtotalCents >= SHIPPING.freeOver * 100 ? 0 : SHIPPING.flat * 100;
      const totalCents = subtotalCents + shippingCents;
      const orderId = randomUUID();
      const publicId = `IH${randomBytes(5).toString("hex").toUpperCase()}`;

      // Handle specific payment methods
      let orderStatus = "pending";
      let paymentStatus = "pending";
      let paymentReference = "";

      if (paymentMethod === "bank_transfer") {
        paymentReference = typeof body.paymentReference === "string" ? body.paymentReference.trim() : "";
        orderStatus = "pending";
        paymentStatus = "paid";
      } else if (paymentMethod === "jazzcash") {
        const jcResult = await processJazzCashPayment({
          orderId: publicId,
          amountCents: totalCents,
          mobileNumber: body.jazzcashMobile || phone,
          cnicLast6: body.jazzcashCnic || "",
        });
        if (!jcResult.success) {
          await connection.rollback();
          return NextResponse.json({ error: jcResult.error || "JazzCash payment failed." }, { status: 400 });
        }
        orderStatus = "pending";
        paymentStatus = "paid";
        paymentReference = jcResult.reference || "";
      } else if (paymentMethod === "easypaisa") {
        const epResult = await processEasyPaisaPayment({
          orderId: publicId,
          amountCents: totalCents,
          mobileNumber: body.easypaisaMobile || phone,
        });
        if (!epResult.success) {
          await connection.rollback();
          return NextResponse.json({ error: epResult.error || "EasyPaisa payment failed." }, { status: 400 });
        }
        orderStatus = "pending";
        paymentStatus = "paid";
        paymentReference = epResult.reference || "";
      }

      await connection.execute(
        `INSERT INTO orders (
          id, public_id, customer_id, email, customer_name, phone, has_whatsapp, whatsapp_number,
          address_line1, address_line2, city, region, postal_code, country,
          subtotal_cents, discount_cents, shipping_cents, total_cents, currency, status, payment_status, payment_method, payment_reference
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pkr', ?, ?, ?, ?)`,
        [
          orderId, publicId, isCustomer ? user.id : null, email, customerName, phone, hasWhatsapp ? 1 : 0, whatsappNumber || null, address,
          address2, city, region, postalCode, country, rawSubtotal, discount, shippingCents, totalCents,
          orderStatus, paymentStatus, paymentMethod, paymentReference,
        ],
      );

      await connection.execute(
        "INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, ?, ?)",
        [orderId, orderStatus, isCustomer ? user.id : null],
      );

      for (const item of itemRows) {
        await connection.execute(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents, subtotal_cents, total_cents)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.id, item.quantity, item.unitPriceCents, item.lineCents, item.totalCents],
        );
        await connection.execute(
          "UPDATE inventory SET stock = stock - ? WHERE product_id = ? AND stock >= ?",
          [item.quantity, item.id, item.quantity],
        );
      }

      await connection.commit();

      // Trigger asynchronous Order Confirmation Email
      sendOrderConfirmationEmail({
        orderId: publicId,
        customerName,
        email,
        phone,
        items: itemRows.map((i) => ({
          name: i.name,
          short: i.short,
          size: i.size,
          img: i.img,
          quantity: i.quantity,
          unitPriceFormatted: money(i.unitPriceCents / 100),
          totalFormatted: money(i.totalCents / 100),
        })),
        subtotalFormatted: money(rawSubtotal / 100),
        discountFormatted: discount > 0 ? money(discount / 100) : null,
        couponCode: coupon || null,
        shippingFormatted: shippingCents === 0 ? "Free Delivery" : money(shippingCents / 100),
        totalFormatted: money(totalCents / 100),
        paymentMethod,
        paymentReference,
        address: [address, address2, city, country].filter(Boolean).join(", "),
      }).catch((err) => console.error("Could not send confirmation email:", err.message));

      return NextResponse.json({
        orderId: publicId,
        total: totalCents,
        status: orderStatus,
        paymentMethod,
        paymentReference,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Could not create checkout:", error);
    if (error.message?.includes("configured") || error.message?.includes("STRIPE")) {
      return NextResponse.json({ error: "Online checkout is not configured yet." }, { status: 503 });
    }
    return NextResponse.json({ error: "We couldn’t complete checkout. Please check the details and try again." }, { status: 500 });
  }
}
