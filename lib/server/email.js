import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { getBankDetails } from "./payments.js";

let transporter = null;

export function getEmailTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (host && user && pass) {
    const isSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  } else {
    // Return null if not configured - calls will log gracefully
    transporter = null;
  }
  return transporter;
}

export async function verifySmtpConnection() {
  const mailer = getEmailTransporter();
  if (!mailer) {
    return { ok: false, error: "SMTP is not configured in .env.local (SMTP_HOST, SMTP_USER, SMTP_PASSWORD missing)." };
  }
  try {
    await mailer.verify();
    return { ok: true, message: "SMTP connection verified successfully." };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

const FROM_EMAIL = process.env.SMTP_FROM || (process.env.SMTP_USER ? `"Maison Ihsaan Ali" <${process.env.SMTP_USER}>` : '"Maison Ihsaan Ali" <orders@maisonihsaanali.com>');

export async function sendEmail({ to, subject, html, text, attachments = [] }) {
  const mailer = getEmailTransporter();
  if (!mailer) {
    console.log(`[Email Simulation] To: ${to} | Subject: ${subject}`);
    return { simulated: true, success: true };
  }

  try {
    const info = await mailer.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, " "),
      html,
      attachments,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Failed to send email:", error.message);
    return { success: false, error: error.message };
  }
}

export async function sendOrderConfirmationEmail({
  orderId,
  customerName,
  email,
  phone,
  items = [],
  subtotalFormatted,
  discountFormatted,
  couponCode,
  shippingFormatted,
  totalFormatted,
  paymentMethod,
  paymentReference,
  address,
}) {
  const methodLabel =
    paymentMethod === "jazzcash" ? "JazzCash Mobile Account" :
    paymentMethod === "easypaisa" ? "EasyPaisa Mobile Account" :
    paymentMethod === "bank_transfer" ? "Direct Bank Transfer (IBFT)" :
    paymentMethod === "stripe" ? "Credit / Debit Card (Stripe)" : "Cash on Delivery (COD)";

  const appUrl = process.env.APP_URL || "http://localhost:3001";
  const trackUrl = `${appUrl}/track?order=${encodeURIComponent(orderId)}&email=${encodeURIComponent(email)}`;
  const orderDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const isBank = paymentMethod === "bank_transfer";
  const isCod = paymentMethod === "cash_on_delivery" || !paymentMethod;
  const bank = getBankDetails();

  const attachments = [];
  const logoPath = path.join(process.cwd(), "public/assets/images/logo-ring-email.png");
  let hasLogoAttachment = false;
  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: "logo-ring.png",
      path: logoPath,
      cid: "brand-logo",
    });
    hasLogoAttachment = true;
  }

  // Render product items with images, variant, quantity and pricing
  const itemRowsHtml = items.map((item, index) => {
    let imageSrc = "";
    if (item.img) {
      if (item.img.startsWith("http://") || item.img.startsWith("https://")) {
        imageSrc = item.img;
      } else {
        const cleanPath = item.img.replace(/^\//, "");
        const localPath = path.join(process.cwd(), "public", cleanPath);
        if (fs.existsSync(localPath)) {
          const cid = `item-img-${index}`;
          attachments.push({
            filename: path.basename(localPath),
            path: localPath,
            cid: cid,
          });
          imageSrc = `cid:${cid}`;
        } else if (appUrl && !appUrl.includes("localhost")) {
          imageSrc = `${appUrl}/${cleanPath}`;
        }
      }
    }

    const imageHtml = imageSrc
      ? `<img src="${imageSrc}" alt="${item.name || "Fragrance"}" width="120" height="135" style="width: 120px; height: 135px; object-fit: contain; border-radius: 6px; display: block; margin: 0 auto; background: #ffffff;" />`
      : `<div style="width: 120px; height: 135px; background: #f5f2ea; border-radius: 6px; color: #8c7247; font-size: 11px; font-weight: bold; text-align: center; line-height: 135px; letter-spacing: 2px;">PARFUM</div>`;

    return `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #ede8e1;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 135px; vertical-align: middle; text-align: center; padding-right: 18px;">
                <div style="background: #ffffff; border: 1px solid #e8e3d9; border-radius: 6px; padding: 10px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                  ${imageHtml}
                </div>
              </td>
              <td style="vertical-align: middle;">
                <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #9c7b46; font-weight: 700; margin-bottom: 4px;">
                  ${item.size ? `${item.size} · ` : ""}${item.short || "Haute Parfumerie"}
                </div>
                <div style="font-weight: 600; font-size: 16px; color: #111111; line-height: 1.3; margin-bottom: 6px;">
                  ${item.name || "Artisanal Fragrance"}
                </div>
                ${item.short ? `<div style="font-size: 13px; color: #666666; margin-bottom: 10px; line-height: 1.4;">${item.short}</div>` : ""}
                <div style="font-size: 13px; color: #444444; background: #faf9f7; border: 1px solid #ede8e1; border-radius: 4px; padding: 6px 12px; display: inline-block; margin-bottom: 8px;">
                  Quantity: <strong>${item.quantity}</strong>
                  ${item.unitPriceFormatted ? ` <span style="color: #777;">(${item.unitPriceFormatted} each)</span>` : ""}
                </div>
                <div style="font-weight: 700; font-size: 17px; color: #111111;">
                  ${item.totalFormatted || item.total_formatted || ""}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join("");

  // Bank transfer instruction card (for IBFT orders)
  const bankDetailsBlock = isBank ? `
    <div style="background: #faf8f5; border: 1px solid #d9ceb9; border-radius: 6px; padding: 20px; margin: 24px 0;">
      <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #9c7b46; font-weight: 700; margin-bottom: 8px;">
        Direct Bank Transfer (IBFT) Details
      </div>
      <p style="margin: 0 0 12px; font-size: 13px; color: #333333; line-height: 1.5;">
        Kindly transfer the exact invoice total of <strong>${totalFormatted}</strong> to our bank account:
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #222222; line-height: 1.7;">
        <tr><td style="width: 110px; color: #777777;">Bank:</td><td><strong>${bank.bankName}</strong></td></tr>
        <tr><td style="color: #777777;">Account Title:</td><td><strong>${bank.accountTitle}</strong></td></tr>
        <tr><td style="color: #777777;">Account No:</td><td><strong>${bank.accountNumber}</strong></td></tr>
        <tr><td style="color: #777777;">IBAN:</td><td><strong>${bank.iban}</strong></td></tr>
        <tr><td style="color: #777777;">Branch:</td><td>${bank.branch}</td></tr>
        ${paymentReference ? `<tr><td style="color: #777777;">Reference ID:</td><td><strong style="color: #2e7d32;">${paymentReference}</strong></td></tr>` : ""}
      </table>
      <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #d9ceb9; font-size: 12px; color: #666666;">
        Please share your IBFT receipt or transaction ID at <a href="mailto:care@ehsaanali.com" style="color: #111111; font-weight: 600;">care@ehsaanali.com</a> or WhatsApp for immediate order dispatch.
      </div>
    </div>
  ` : "";

  // COD instruction card
  const codNoticeBlock = isCod ? `
    <div style="background: #fbfbfb; border: 1px solid #e5e5e5; border-radius: 6px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #444444; line-height: 1.5;">
      <strong style="color: #111111; display: block; margin-bottom: 3px;">Cash on Delivery (COD) Notice</strong>
      Please keep the exact invoice amount of <strong>${totalFormatted}</strong> ready in cash upon the courier agent’s arrival.
    </div>
  ` : "";

  // JazzCash / EasyPaisa Verified Payment Slip Card
  const isWallet = paymentMethod === "jazzcash" || paymentMethod === "easypaisa";
  const walletSlipBlock = isWallet ? `
    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 18px 20px; margin: 22px 0;">
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; border-bottom: 1px solid #bbf7d0; padding-bottom: 10px;">
        <tr>
          <td>
            <span style="background: #16a34a; color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: 1px;">PAID & VERIFIED</span>
            <strong style="font-size: 14px; color: #166534; margin-left: 8px;">${paymentMethod === "jazzcash" ? "JazzCash Official Payment Slip" : "EasyPaisa Official Payment Slip"}</strong>
          </td>
          <td style="text-align: right; color: #15803d; font-size: 12px; font-weight: 600;">
            Receipt Confirmed ✓
          </td>
        </tr>
      </table>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1f2937; line-height: 1.8;">
        <tr>
          <td style="width: 150px; color: #6b7280;">Transaction Ref (TID):</td>
          <td><strong style="color: #15803d; font-family: monospace, Courier, monospace; font-size: 14px;">${paymentReference || `JC-${orderId}`}</strong></td>
        </tr>
        <tr>
          <td style="color: #6b7280;">Amount Credited:</td>
          <td><strong style="color: #111111; font-size: 14px;">${totalFormatted}</strong></td>
        </tr>
        <tr>
          <td style="color: #6b7280;">Payment Channel:</td>
          <td><strong>${paymentMethod === "jazzcash" ? "JazzCash Mobile Account / MWALLET" : "EasyPaisa Mobile Account"}</strong></td>
        </tr>
        <tr>
          <td style="color: #6b7280;">Transaction Time:</td>
          <td>${orderDate}</td>
        </tr>
      </table>
      <div style="margin-top: 10px; padding-top: 8px; font-size: 11px; color: #166534; border-top: 1px dashed #bbf7d0;">
        This electronic payment receipt confirms that funds have been credited to Maison Ihsaan Ali. Your fragrance order is confirmed for express dispatch.
      </div>
    </div>
  ` : "";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation #${orderId}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f6f4f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 620px; margin: 30px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #e8e3d9;">
        
        <!-- Luxury Brand Header -->
        <div style="background-color: #111111; text-align: center; padding: 30px 20px 24px; border-top: 4px solid #c5a47e;">
          ${hasLogoAttachment ? `<img src="cid:brand-logo" alt="Maison Ihsaan Ali" width="56" height="56" style="width: 56px; height: 56px; margin: 0 auto 10px; display: block;" />` : ""}
          <div style="font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #c5a47e; margin-bottom: 6px;">
            HAUTE PARFUMERIE
          </div>
          <h1 style="letter-spacing: 4px; text-transform: uppercase; margin: 0; font-size: 20px; font-weight: 400; color: #ffffff;">
            MAISON IHSAAN ALI
          </h1>
          <div style="width: 36px; height: 1px; background-color: #c5a47e; margin: 12px auto 0;"></div>
        </div>

        <div style="padding: 32px 28px;">
          
          <!-- Order Confirmation Salutation -->
          <div style="margin-bottom: 24px;">
            <span style="display: inline-block; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #9c7b46; font-weight: 700; margin-bottom: 6px;">
              Order Confirmation & Invoice
            </span>
            <h2 style="font-weight: 400; font-size: 22px; margin: 0 0 10px; color: #111111;">
              Thank you for your patronage, ${customerName || "Valued Patron"}.
            </h2>
            <p style="margin: 0; font-size: 14px; color: #555555; line-height: 1.6;">
              Your bespoke curation has been received. Our atelier is packaging your fragrance with utmost care and attention.
            </p>
          </div>

          <!-- Prominent Order & Tracking Badge -->
          <div style="background-color: #faf9f6; border: 1px dashed #c5a47e; border-radius: 6px; padding: 16px 20px; margin-bottom: 28px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="vertical-align: middle;">
                  <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #888888; font-weight: 600;">
                    Tracking & Order ID
                  </div>
                  <div style="font-family: monospace, Courier, monospace; font-size: 17px; font-weight: bold; margin-top: 3px;">
                    <a href="${trackUrl}" style="color: #111111; text-decoration: none;" title="Click to auto-track order status">
                      ${orderId} <span style="font-size: 13px; color: #9c7b46;">↗</span>
                    </a>
                  </div>
                </td>
                <td style="text-align: right; vertical-align: middle;">
                  <div style="font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #888888;">Order Date</div>
                  <div style="font-weight: 600; color: #333333; margin-top: 3px;">${orderDate}</div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Curated Products Section -->
          <div style="margin-bottom: 28px;">
            <div style="font-size: 12px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; color: #111111; padding-bottom: 10px; border-bottom: 2px solid #111111;">
              Curated Items
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              ${itemRowsHtml}
            </table>
          </div>

          <!-- Invoice Breakdown -->
          <div style="background-color: #faf9f6; border-radius: 6px; padding: 20px; border: 1px solid #ede8e1; margin-bottom: 24px;">
            <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #888888; font-weight: 700; margin-bottom: 12px;">
              Invoice Summary
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #555555;">Subtotal</td>
                <td style="padding: 6px 0; text-align: right; color: #111111; font-weight: 500;">
                  ${subtotalFormatted || totalFormatted}
                </td>
              </tr>
              ${discountFormatted ? `
              <tr>
                <td style="padding: 6px 0; color: #2e7d32;">
                  Privilege Discount ${couponCode ? `(${couponCode})` : ""}
                </td>
                <td style="padding: 6px 0; text-align: right; color: #2e7d32; font-weight: 500;">
                  -${discountFormatted}
                </td>
              </tr>
              ` : ""}
              <tr>
                <td style="padding: 6px 0; color: #555555;">Delivery & Courier Handling</td>
                <td style="padding: 6px 0; text-align: right; color: #111111; font-weight: 500;">
                  ${shippingFormatted || "Complimentary Delivery"}
                </td>
              </tr>
              <tr>
                <td style="padding: 14px 0 0; color: #111111; font-size: 16px; font-weight: 700; border-top: 2px solid #111111;">
                  Total Amount (Invoice)
                </td>
                <td style="padding: 14px 0 0; text-align: right; color: #111111; font-size: 19px; font-weight: 700; border-top: 2px solid #111111;">
                  ${totalFormatted}
                </td>
              </tr>
            </table>
          </div>

          <!-- Delivery & Payment Information Grid -->
          <div style="border: 1px solid #ede8e1; border-radius: 6px; padding: 18px 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 12px;">
                  <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #9c7b46; font-weight: 700; margin-bottom: 6px;">
                    Delivery Destination
                  </div>
                  <div style="font-weight: 600; color: #111111; margin-bottom: 4px;">
                    ${customerName || "Customer"}
                  </div>
                  ${address ? `<div style="color: #444444; line-height: 1.5;">${address}</div>` : ""}
                  ${phone ? `<div style="color: #666666; margin-top: 6px;">Tel: <strong>${phone}</strong></div>` : ""}
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 12px; border-left: 1px solid #ede8e1;">
                  <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #9c7b46; font-weight: 700; margin-bottom: 6px;">
                    Payment Information
                  </div>
                  <div style="color: #444444; line-height: 1.6;">
                    <div>Method: <strong>${methodLabel}</strong></div>
                    ${paymentReference ? `<div>Reference ID: <strong style="color: #2e7d32;">${paymentReference}</strong></div>` : ""}
                    <div>Status: <strong>${isBank ? "Awaiting Transfer" : isCod ? "Payable on Delivery" : "Confirmed"}</strong></div>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          ${bankDetailsBlock}
          ${codNoticeBlock}
          ${walletSlipBlock}

          <!-- Live Tracking CTA with Automatic Instant Status -->
          <div style="text-align: center; margin: 32px 0 22px;">
            <a href="${trackUrl}" style="background-color: #111111; color: #ffffff; text-decoration: none; padding: 14px 36px; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; font-weight: 600; display: inline-block; border-radius: 2px; border: 1px solid #111111; box-shadow: 0 2px 8px rgba(0,0,0,0.12);">
              View Live Order Status →
            </a>
            <div style="margin-top: 10px; font-size: 12px; color: #777777;">
              Direct auto-tracking link (instant status without typing):<br>
              <a href="${trackUrl}" style="color: #9c7b46; font-size: 11px; word-break: break-all; text-decoration: underline;">
                ${trackUrl}
              </a>
            </div>
          </div>

          <!-- Concierge Support -->
          <div style="text-align: center; padding-top: 22px; border-top: 1px solid #ede8e1; font-size: 13px; color: #666666; line-height: 1.6;">
            Should you have any inquiries regarding your curation or wish to modify delivery arrangements, our concierge care is at your disposal at
            <a href="mailto:care@ehsaanali.com" style="color: #111111; font-weight: 600; text-decoration: none;">care@ehsaanali.com</a>.
          </div>

        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 22px 20px; background-color: #faf9f6; border-top: 1px solid #ede8e1; font-size: 11px; color: #999999;">
          <div style="letter-spacing: 1px; text-transform: uppercase; color: #666666; margin-bottom: 6px;">
            Maison Ihsaan Ali — Fine fragrance for a more meaningful you.
          </div>
          <div>© ${new Date().getFullYear()} Maison Ihsaan Ali. All rights reserved.</div>
        </div>

      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Order Confirmation #${orderId} — Maison Ihsaan Ali`,
    html,
    attachments,
  });
}

export async function sendPasswordResetEmail({ email, customerName, resetUrl }) {
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
      <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #000;">
        <h1 style="letter-spacing: 3px; text-transform: uppercase; margin: 0; font-size: 20px;">MAISON IHSAAN ALI</h1>
        <p style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin: 5px 0 0; color: #777;">Haute Parfumerie</p>
      </div>
      <div style="padding: 30px 20px;">
        <h2 style="font-weight: 400; font-size: 20px; margin-top: 0;">Password Reset Request</h2>
        <p>Greetings ${customerName || "there"},</p>
        <p>We received a request to reset the password associated with your customer account at Maison Ihsaan Ali.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #000; color: #fff; text-decoration: none; padding: 12px 30px; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; display: inline-block;">
            Reset Your Password
          </a>
        </div>
        <p style="font-size: 13px; color: #777;">
          This link is valid for 1 hour. If you did not request this, please disregard this transmission; your password remains untouched and secure.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject: "Reset your Maison Ihsaan Ali password",
    html,
  });
}

export async function sendContactEmail({ name, email, message }) {
  const adminEmail = process.env.LOCAL_ADMIN_EMAIL || "admin@ihsaan.local";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      <h3>New Inquiry from Storefront Contact Form</h3>
      <p><strong>From:</strong> ${name} (&lt;${email}&gt;)</p>
      <div style="background: #f5f5f5; padding: 15px; border-left: 3px solid #000; margin: 20px 0;">
        ${message.replace(/\n/g, "<br>")}
      </div>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `New Store Inquiry from ${name}`,
    html,
  });
}
