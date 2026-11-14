import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

// Read .env.local manually if not already in process.env
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// Dynamically import email module after environment variables are loaded
const { sendOrderConfirmationEmail } = await import("../lib/server/email.js");

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT) || 587;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASSWORD;
const isSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
const from = process.env.SMTP_FROM || (user ? `"Maison Ihsaan Ali" <${user}>` : '"Maison Ihsaan Ali" <orders@ehsaanali.com>');

console.log("\n=================================");
console.log("  SMTP Configuration Checker");
console.log("=================================");
console.log(`Host:    ${host || "(not set)"}`);
console.log(`Port:    ${port}`);
console.log(`Secure:  ${isSecure}`);
console.log(`User:    ${user || "(not set)"}`);
console.log(`Pass:    ${pass ? "********" : "(not set)"}`);
console.log(`From:    ${from}`);
console.log("=================================\n");

if (!host || !user || !pass) {
  console.error("❌ Error: Missing SMTP credentials in .env.local.");
  console.error("Please ensure SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are set.\n");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: isSecure,
  auth: { user, pass },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

console.log("⏳ Testing connection and authentication with SMTP server...");

try {
  await transporter.verify();
  console.log("✅ Connection successfully verified! Your SMTP server is ready to send emails.\n");

  const targetEmail = process.argv[2];
  if (targetEmail) {
    console.log(`⏳ Sending full luxury Order Confirmation & Invoice template to ${targetEmail}...`);
    const result = await sendOrderConfirmationEmail({
      orderId: "IH46EF0217EC",
      customerName: "Ehsaan Ali",
      email: targetEmail,
      phone: "+92 300 1234567",
      items: [
        {
          name: "Velvet Smoke Eau de Parfum",
          short: "Warm amber, smoked spices & sandalwood",
          size: "50 ml",
          img: "/assets/images/product-eau-de-parfum.jpg",
          quantity: 1,
          unitPriceFormatted: "Rs. 12,000",
          totalFormatted: "Rs. 12,000",
        },
        {
          name: "Velvet Smoke Extrait de Parfum",
          short: "Intense nocturnal concentration",
          size: "50 ml",
          img: "/assets/images/product-extrait-de-parfum.jpg",
          quantity: 1,
          unitPriceFormatted: "Rs. 14,000",
          totalFormatted: "Rs. 14,000",
        },
      ],
      subtotalFormatted: "Rs. 26,000",
      discountFormatted: "Rs. 3,900",
      couponCode: "EHSAAN15",
      shippingFormatted: "Free Complimentary Delivery",
      totalFormatted: "Rs. 22,100",
      paymentMethod: "bank_transfer",
      paymentReference: "IBFT-984210",
      address: "Bungalow 42, Sector Y, Phase 5, DHA, Lahore, Pakistan",
    });

    if (result.success) {
      console.log(`✅ Luxury Order Confirmation & Invoice template delivered!`);
      console.log(`   Message ID: ${result.messageId}\n`);
    } else {
      console.error(`❌ Delivery error:`, result.error);
    }
  } else {
    console.log(`💡 Tip: To send the full luxury order template to your inbox, run:`);
    console.log(`   node scripts/test-smtp.mjs your-email@gmail.com\n`);
  }
} catch (error) {
  console.error("❌ SMTP Verification Failed:");
  console.error(`   ${error.message}\n`);
  process.exit(1);
}
