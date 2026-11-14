# Maison Ihsaan Ali

Next.js App Router storefront with a local MySQL database, customer/admin accounts, Cash on Delivery checkout, reviews and optional Stripe Checkout.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). MySQL must be running locally.

## Storefront routes

- `/` — home
- `/shop` — product catalogue and filters
- `/product?id=edp` — product details, reviews and related products
- `/cart`, `/checkout` — cart and local Cash on Delivery checkout; card checkout is optional
- `/wishlist` — browser-based wishlist
- `/account` — local MySQL sign-in, customer profile and account-linked orders
- `/admin` — protected local admin dashboard for product create/edit/delete, inventory, homepage media and copy, images and review moderation
- `/order`, `/track` — paid-order receipt and order status
- `/story`, `/contact`, `/policies` — brand and support pages

Old `.html` URLs redirect to their new routes. Product, stock, order, account, admin, review and newsletter data is stored in the local MySQL database. Guest cart and wishlist state stays in that visitor's browser until checkout, when the order is persisted in MySQL.

## Set up local MySQL

1. Install and start the MySQL server on this computer. It must accept local TCP connections on `127.0.0.1:3306`.
2. Run `npm run db:setup` from a terminal. Enter your local MySQL administrator password when prompted. The script creates the `ihsaan_fragrance` database, a restricted `ihsaan_app` DB user, the tables and seed products, and a local administrator account.
3. The script writes database and admin credentials to `.env.local`, which is ignored by Git and created with owner-only permissions. Values such as `generated-by-db-setup` in `.env.example` are placeholders; the setup replaces them with generated credentials. Open `.env.local` to see the admin email/password, then sign in at `/admin`. If you change `LOCAL_ADMIN_PASSWORD` there, rerun `npm run db:setup` to sync it with the database.
4. Run `npm run dev`. The app uses MySQL for products, inventory, checkout orders, reviews, customer accounts and admin content.
5. Cash on Delivery is the local checkout option and does not require an external payment account. To accept cards, configure Stripe test keys below; never put secret keys in frontend code or commit them.

The database schema and seed data are in [`database/schema.sql`](./database/schema.sql). Re-run `npm run db:setup` to apply safe schema migrations and seed any missing default products. Product reviews require a customer account; the reviewer identity is taken from that account, and a purchase is marked verified only when a qualifying order is linked to it. In the admin storefront editor, homepage headings, descriptions, button labels and destinations, hero/lifestyle images and video URLs can be updated. Product image assignments save immediately, while storefront section edits require saving that section. Images can be deleted only after they are no longer in use.

## SMTP Email Configuration

For order confirmation emails, password reset links, and contact form messages, add your SMTP credentials to `.env.local`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM="Maison Ihsaan Ali" <your-email@gmail.com>
```

To verify your SMTP connection or send a test email:

```bash
npm run test:smtp
# Or send a test email directly:
node scripts/test-smtp.mjs recipient@example.com
```

## Optional Stripe card payments

1. Create a Stripe account and use test credentials until checkout and refunds have been tested.
2. Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `APP_URL`, and `STRIPE_ALLOWED_COUNTRIES` to `.env.local`. Set the allowed countries to places the store can actually ship to.
3. Configure the Stripe webhook at `${APP_URL}/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `charge.refunded`.
4. Test a complete card checkout, webhook delivery, stock handling, order history, tracking and refunds before enabling live keys.

## Order and payment behavior

Checkout requires a signed-in customer account. Registration records the customer's name, email and phone; each order is attached to that account and records the delivery phone/address. Checkout calculates prices and shipping on the server and reserves MySQL inventory in a transaction. Cash on Delivery orders are saved as pending; card payments use Stripe-hosted Checkout and are saved after the signed webhook confirms payment. Card data is never handled by this app.

Customer/admin passwords are stored as scrypt hashes. Session IDs are random, stored hashed in MySQL, and sent only in HttpOnly cookies. Customers track orders after signing in; the order number is matched against the authenticated account rather than an email/phone lookup. Admins can advance pending/paid orders to packed, packed to shipped, and shipped to delivered. Each status change is recorded in `order_status_history` and shown to the customer in tracking.

The admin overview reports total orders, pending orders, delivered orders, recognized revenue, delivered revenue, and fragrance-level order/unit/revenue totals. Recognized revenue includes paid Stripe orders and delivered Cash on Delivery orders, while excluding pending COD and refunded/failed inventory orders. The Orders view shows registered customer details and offers the next valid fulfilment action.

Reviews are stored in MySQL and require admin approval before publishing. Newsletter signups are saved in MySQL; sending campaign emails requires a separate email provider. Transactional emails, shipment-provider integration, legal policies and business/tax configuration remain launch tasks. This local database is for development on this computer; a public deployment needs a reachable hosted MySQL server and secure production configuration.

## Build and run

```bash
npm run build
npm run start
```
