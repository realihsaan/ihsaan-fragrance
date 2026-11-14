import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface, emitKeypressEvents } from "node:readline";
import mysql from "mysql2/promise";

const database = "ihsaan_fragrance";
const appUser = "ihsaan_app";
const envPath = new URL("../.env.local", import.meta.url);
const schemaPath = new URL("../database/schema.sql", import.meta.url);

function readEnv(source) {
  return Object.fromEntries(source.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    return match ? [[match[1], match[2].replace(/^(['"])(.*)\1$/, "$2")]] : [];
  }));
}

function hiddenPrompt(prompt) {
  if (!process.stdin.isTTY) {
    throw new Error("Set MYSQL_ROOT_PASSWORD in the environment or run this command in an interactive terminal.");
  }
  return new Promise((resolve) => {
    const input = createInterface({ input: process.stdin, output: process.stdout });
    process.stdout.write(prompt);
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    let value = "";
    const onKeypress = (character, key) => {
      if (key?.ctrl && key.name === "c") {
        process.stdin.setRawMode(false);
        input.close();
        process.exit(130);
      }
      if (key?.name === "return") {
        process.stdin.setRawMode(false);
        process.stdin.off("keypress", onKeypress);
        input.close();
        process.stdout.write("\n");
        resolve(value);
        return;
      }
      if (key?.name === "backspace") value = value.slice(0, -1);
      else if (!key?.ctrl && character) value += character;
    };
    process.stdin.on("keypress", onKeypress);
  });
}

async function main() {
  let env = {};
  let existing = "";
  try {
    existing = await readFile(envPath, "utf8");
    env = readEnv(existing);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const rootPassword = process.env.MYSQL_ROOT_PASSWORD || await hiddenPrompt("Local MySQL root password: ");
  if (!rootPassword) throw new Error("The MySQL administrator password cannot be empty.");

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_SETUP_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_SETUP_PORT || 3306),
    user: process.env.MYSQL_SETUP_USER || "root",
    password: rootPassword,
    multipleStatements: true,
  });

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    const appPassword = !env.MYSQL_PASSWORD || env.MYSQL_PASSWORD === "generated-by-db-setup"
      ? randomBytes(32).toString("base64url")
      : env.MYSQL_PASSWORD;
    const adminEmail = (env.LOCAL_ADMIN_EMAIL || "admin@ihsaan.local").trim().toLowerCase();
    const adminPassword = !env.LOCAL_ADMIN_PASSWORD || env.LOCAL_ADMIN_PASSWORD === "generated-by-db-setup"
      ? randomBytes(18).toString("base64url")
      : env.LOCAL_ADMIN_PASSWORD;

    await connection.query(
      `CREATE USER IF NOT EXISTS '${appUser}'@'127.0.0.1' IDENTIFIED BY ${connection.escape(appPassword)}`,
    );
    await connection.query(
      `ALTER USER '${appUser}'@'127.0.0.1' IDENTIFIED BY ${connection.escape(appPassword)}`,
    );
    await connection.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON \`${database}\`.* TO '${appUser}'@'127.0.0.1'`,
    );
    await connection.query(`FLUSH PRIVILEGES`);

    const appConnection = await mysql.createConnection({
      host: "127.0.0.1",
      port: Number(process.env.MYSQL_SETUP_PORT || 3306),
      database,
      user: appUser,
      password: appPassword,
      multipleStatements: true,
      decimalNumbers: true,
    });

    try {
      await appConnection.query(
        `CREATE TABLE IF NOT EXISTS storefront_content (
          content_key VARCHAR(40) PRIMARY KEY,
          image_url VARCHAR(2048) NOT NULL,
          video_url VARCHAR(2048) NOT NULL DEFAULT '',
          alt_text VARCHAR(300) NOT NULL DEFAULT '',
          eyebrow_text VARCHAR(255) NOT NULL DEFAULT '',
          heading_text VARCHAR(500) NOT NULL DEFAULT '',
          body_text TEXT NOT NULL,
          button_text VARCHAR(120) NOT NULL DEFAULT '',
          button_href VARCHAR(2048) NOT NULL DEFAULT '',
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      );
      const storefrontContentColumns = [
        ["video_url", "VARCHAR(2048) NOT NULL DEFAULT ''"],
        ["eyebrow_text", "VARCHAR(255) NOT NULL DEFAULT ''"],
        ["heading_text", "VARCHAR(500) NOT NULL DEFAULT ''"],
        ["body_text", "TEXT NOT NULL"],
        ["button_text", "VARCHAR(120) NOT NULL DEFAULT ''"],
        ["button_href", "VARCHAR(2048) NOT NULL DEFAULT ''"],
      ];
      const [existingStorefrontColumns] = await appConnection.execute("SHOW COLUMNS FROM storefront_content");
      for (const [column, definition] of storefrontContentColumns) {
        if (!existingStorefrontColumns.some((existingColumn) => existingColumn.Field === column)) {
          await appConnection.query(`ALTER TABLE storefront_content ADD COLUMN ${column} ${definition}`);
          if (column === "video_url") {
            await appConnection.execute(
              `UPDATE storefront_content
               SET video_url = CASE content_key
                 WHEN 'hero_image' THEN '/assets/videos/hero_bg.mp4'
                 WHEN 'lifestyle_image' THEN '/assets/videos/woman_used.mp4'
                 ELSE video_url
               END
               WHERE content_key IN ('hero_image', 'lifestyle_image')`,
            );
          }
        }
      }
      await appConnection.query(await readFile(schemaPath, "utf8"));
      const [userPhoneColumns] = await appConnection.execute("SHOW COLUMNS FROM users LIKE 'phone'");
      if (!userPhoneColumns.length) {
        await appConnection.query("ALTER TABLE users ADD COLUMN phone VARCHAR(50) NOT NULL DEFAULT '' AFTER full_name");
      }
      await appConnection.query(
        `INSERT IGNORE INTO order_status_history (order_id, status, changed_by, created_at)
         SELECT id, status, NULL, created_at FROM orders`,
      );
      const [discountColumns] = await appConnection.execute("SHOW COLUMNS FROM orders LIKE 'discount_cents'");
      if (!discountColumns.length) {
        await appConnection.query("ALTER TABLE orders ADD COLUMN discount_cents INT UNSIGNED NOT NULL DEFAULT 0 AFTER subtotal_cents");
      }
      const [whatsappColumns] = await appConnection.execute("SHOW COLUMNS FROM orders LIKE 'has_whatsapp'");
      if (!whatsappColumns.length) {
        await appConnection.query("ALTER TABLE orders ADD COLUMN has_whatsapp BOOLEAN NOT NULL DEFAULT TRUE AFTER phone");
      }
      const [whatsappNumColumns] = await appConnection.execute("SHOW COLUMNS FROM orders LIKE 'whatsapp_number'");
      if (!whatsappNumColumns.length) {
        await appConnection.query("ALTER TABLE orders ADD COLUMN whatsapp_number VARCHAR(50) NULL AFTER has_whatsapp");
      }
      await appConnection.query("ALTER TABLE orders MODIFY COLUMN payment_method VARCHAR(32) NOT NULL DEFAULT 'cash_on_delivery'");
      const [paymentRefCols] = await appConnection.execute("SHOW COLUMNS FROM orders LIKE 'payment_reference'");
      if (!paymentRefCols.length) {
        await appConnection.query("ALTER TABLE orders ADD COLUMN payment_reference VARCHAR(255) NULL AFTER payment_method");
      }
      const [paymentProofCols] = await appConnection.execute("SHOW COLUMNS FROM orders LIKE 'payment_proof'");
      if (!paymentProofCols.length) {
        await appConnection.query("ALTER TABLE orders ADD COLUMN payment_proof VARCHAR(2048) NULL AFTER payment_reference");
      }
      const [paymentStatusCols] = await appConnection.execute("SHOW COLUMNS FROM orders LIKE 'payment_status'");
      if (!paymentStatusCols.length) {
        await appConnection.query("ALTER TABLE orders ADD COLUMN payment_status ENUM('pending', 'submitted', 'paid', 'refunded') NOT NULL DEFAULT 'pending' AFTER status");
      }
      const [courierNameCols] = await appConnection.execute("SHOW COLUMNS FROM orders LIKE 'courier_name'");
      if (!courierNameCols.length) {
        await appConnection.query("ALTER TABLE orders ADD COLUMN courier_name VARCHAR(100) NULL AFTER payment_proof");
      }
      const [courierCnCols] = await appConnection.execute("SHOW COLUMNS FROM orders LIKE 'courier_cn'");
      if (!courierCnCols.length) {
        await appConnection.query("ALTER TABLE orders ADD COLUMN courier_cn VARCHAR(100) NULL AFTER courier_name");
      }
      const [remitRefCols] = await appConnection.execute("SHOW COLUMNS FROM orders LIKE 'remittance_reference'");
      if (!remitRefCols.length) {
        await appConnection.query("ALTER TABLE orders ADD COLUMN remittance_reference VARCHAR(255) NULL AFTER courier_cn");
      }
      const [remitProofCols] = await appConnection.execute("SHOW COLUMNS FROM orders LIKE 'remittance_proof'");
      if (!remitProofCols.length) {
        await appConnection.query("ALTER TABLE orders ADD COLUMN remittance_proof MEDIUMTEXT NULL AFTER remittance_reference");
      }
      const [remitAmtCols] = await appConnection.execute("SHOW COLUMNS FROM orders LIKE 'remittance_amount_cents'");
      if (!remitAmtCols.length) {
        await appConnection.query("ALTER TABLE orders ADD COLUMN remittance_amount_cents INT UNSIGNED NULL AFTER remittance_proof");
      }
      const [remitAtCols] = await appConnection.execute("SHOW COLUMNS FROM orders LIKE 'remitted_at'");
      if (!remitAtCols.length) {
        await appConnection.query("ALTER TABLE orders ADD COLUMN remitted_at DATETIME NULL AFTER remittance_amount_cents");
      }
      const [payVerAtCols] = await appConnection.execute("SHOW COLUMNS FROM orders LIKE 'payment_verified_at'");
      if (!payVerAtCols.length) {
        await appConnection.query("ALTER TABLE orders ADD COLUMN payment_verified_at DATETIME NULL AFTER remitted_at");
      }
      const [payVerByCols] = await appConnection.execute("SHOW COLUMNS FROM orders LIKE 'payment_verified_by'");
      if (!payVerByCols.length) {
        await appConnection.query("ALTER TABLE orders ADD COLUMN payment_verified_by VARCHAR(120) NULL AFTER payment_verified_at");
      }
      const [reviewCustomerColumns] = await appConnection.execute("SHOW COLUMNS FROM product_reviews LIKE 'customer_id'");
      if (!reviewCustomerColumns.length) {
        await appConnection.query("ALTER TABLE product_reviews ADD COLUMN customer_id CHAR(36) NULL AFTER product_id");
      }
      const [verifiedPurchaseColumns] = await appConnection.execute("SHOW COLUMNS FROM product_reviews LIKE 'verified_purchase'");
      if (!verifiedPurchaseColumns.length) {
        await appConnection.query("ALTER TABLE product_reviews ADD COLUMN verified_purchase BOOLEAN NOT NULL DEFAULT FALSE AFTER rating");
      }
      const [reviewCustomerIndexes] = await appConnection.execute("SHOW INDEX FROM product_reviews WHERE Key_name = 'reviews_customer_idx'");
      if (!reviewCustomerIndexes.length) {
        await appConnection.query("ALTER TABLE product_reviews ADD INDEX reviews_customer_idx (customer_id)");
      }
      const [reviewCustomerConstraints] = await appConnection.execute(
        `SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS
         WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = 'product_reviews' AND CONSTRAINT_NAME = 'product_reviews_customer_fk'`,
        [database],
      );
      if (!reviewCustomerConstraints.length) {
        await appConnection.query(
          "ALTER TABLE product_reviews ADD CONSTRAINT product_reviews_customer_fk FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL",
        );
      }
      const [existingAdmin] = await appConnection.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [adminEmail]);
      const salt = randomBytes(16);
      const hash = scryptSync(adminPassword, salt, 64);
      const passwordHash = `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
      if (existingAdmin.length) {
        await appConnection.execute(
          "UPDATE users SET role = 'admin', password_hash = ? WHERE id = ?",
          [passwordHash, existingAdmin[0].id],
        );
      } else {
        await appConnection.execute(
          "INSERT INTO users (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, 'admin')",
          [randomUUID(), adminEmail, passwordHash, "Store Administrator"],
        );
      }
    } finally {
      await appConnection.end();
    }

    const settings = {
      MYSQL_HOST: "127.0.0.1",
      MYSQL_PORT: process.env.MYSQL_SETUP_PORT || "3306",
      MYSQL_DATABASE: database,
      MYSQL_USER: appUser,
      MYSQL_PASSWORD: appPassword,
      LOCAL_ADMIN_EMAIL: adminEmail,
      LOCAL_ADMIN_PASSWORD: adminPassword,
    };
    const updated = existing.split(/\r?\n/).filter((line) => !Object.hasOwn(settings, line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=/)?.[1]));
    updated.push("", "# Local MySQL store credentials (do not commit this file)", ...Object.entries(settings).map(([key, value]) => `${key}=${value}`), "");
    await writeFile(envPath, updated.join("\n"), { mode: 0o600 });

    console.log(`Created/verified MySQL database "${database}" and initialized store tables.`);
    console.log(`Administrator login: ${adminEmail}`);
    console.log("The generated local admin password is saved as LOCAL_ADMIN_PASSWORD in .env.local.");
    console.log("Restart the Next.js server to load the new database settings.");
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Local MySQL setup failed:", error.message);
  process.exitCode = 1;
});
