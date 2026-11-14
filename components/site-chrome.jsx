"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { money } from "./catalog";
import { useStore } from "./store-context";

function Logo({ footer = false }) {
  return (
    <Link className="logo" href="/" aria-label="Maison Ihsaan Ali home">
      <Image
        src="/assets/images/logo-ring.png"
        alt="Maison Ihsaan Ali — Crafted Emotions"
        width={footer ? 64 : 76}
        height={footer ? 64 : 76}
        priority={!footer}
        unoptimized
      />
    </Link>
  );
}

export function SiteChrome({ children }) {
  const { items, itemCount, wishlist, user, toast, products, setQuantity } = useStore();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term
      ? products.filter((product) => `${product.name} ${product.tag} ${product.desc}`.toLowerCase().includes(term))
      : [];
  }, [products, query]);

  if (pathname.startsWith("/admin")) return children;

  async function subscribe(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(event.currentTarget).get("email")?.toString().trim() || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterMessage("Enter a valid email address.");
      return;
    }
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn’t save your subscription.");
      setNewsletterMessage(result.existing ? "You’re already on the list." : "Thank you. You’re on the list.");
      form.reset();
    } catch (error) {
      setNewsletterMessage(error.message || "We couldn’t save your subscription.");
    }
  }

  return (
    <>
      <header className="top solid" id="hd">
        <div className="bar">
          <Logo />
          <nav id="nav" className={`cap ${menuOpen ? "on" : ""}`}>
            <Link href="/shop" onClick={() => setMenuOpen(false)}>The Collection</Link>
            <Link href="/story" onClick={() => setMenuOpen(false)}>Our Story</Link>
            <Link href="/track" onClick={() => setMenuOpen(false)}>Live Tracking</Link>
            <Link href="/contact" onClick={() => setMenuOpen(false)}>Concierge</Link>
          </nav>
          <div className="tools">
            <div className="sbox">
              <input
                type="search"
                placeholder="Search scent..."
                aria-label="Search products"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && query.trim()) {
                    window.location.href = `/shop?q=${encodeURIComponent(query.trim())}`;
                  }
                  if (event.key === "Escape") setQuery("");
                }}
              />
              <svg className="i" aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="10" cy="10" r="7" />
                <path d="m15 15 7 7" />
              </svg>
              {query.trim() && (
                <div className="search-results">
                  {results.length ? results.map((product) => (
                    <Link key={product.id} href={`/product?id=${product.id}`} onClick={() => setQuery("")}>
                      <b>{product.name}</b>
                      <span>{money(product.price)}</span>
                    </Link>
                  )) : <div className="res">No matches. Try “Velvet Smoke”.</div>}
                </div>
              )}
            </div>
            <Link className="hbtn cap luxury-wish-btn" href="/wishlist" aria-label={`Wishlist, ${wishlist.length} items`}>
              <span className="wish-heart-icon">♡</span>
              {wishlist.length > 0 && <span className="wish-badge">{wishlist.length}</span>}
            </Link>
            <Link className="hbtn cap account-link" href="/account" aria-label="My account">
              <span className="account-icon" aria-hidden="true">♙</span>
              <span className="account-label">{user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Account"}</span>
            </Link>
            <button id="cartBtn" className="cartbtn cap luxury-cart-btn" type="button" onClick={() => setDrawerOpen(true)}>
              <span className="cart-label">Cart</span>
              <span className="cart-gold-badge">{itemCount}</span>
            </button>
            <button id="menuBtn" type="button" aria-label="Toggle menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>☰</button>
          </div>
        </div>
      </header>
      {children}
      <footer id="footer">
        <div className="footer-top-grid wrap">
          <div className="footer-brand-column">
            <Logo footer />
            <p className="footer-brand-desc">
              Maison Ihsaan Ali is an artisanal haute parfumerie devoted to evocative olfactory craftsmanship. Each formula is hand-blended using premium floral and amber absolutes from Grasse, bottled in bespoke presentation coffrets for an unforgettable signature.
            </p>
            <div className="footer-cert-tags">
              <span>⚜️ Pure Extrait Concentrates</span>
              <span>🌿 Cruelty Free</span>
              <span>🇵🇰 Artisanal Batching in Pakistan</span>
            </div>
          </div>

          <div className="footer-links-column">
            <span className="footer-col-title cap">The House</span>
            <nav className="footer-nav-list cap">
              <Link href="/shop">The Collection</Link>
              <Link href="/story">The Artisan Story</Link>
              <Link href="/track">Live Order Tracking</Link>
              <Link href="/contact">Client Concierge</Link>
              <Link href="/account">Client Account</Link>
            </nav>
          </div>

          <div className="footer-links-column">
            <span className="footer-col-title cap">Client Policies</span>
            <nav className="footer-nav-list cap">
              <Link href="/policies#shipping">Courier Shipping</Link>
              <Link href="/policies#returns">7-Day Return Policy</Link>
              <Link href="/policies#privacy">Client Privacy</Link>
              <Link href="/policies#terms">Terms of Service</Link>
              <Link href="/courier">Courier Remittance Portal</Link>
            </nav>
          </div>

          <div className="footer-newsletter-column">
            <span className="footer-col-title cap">Private Atelier Circle</span>
            <p className="footer-news-desc">Subscribe to receive private invitations to limited-edition seasonal macerations and rare reserve bottles.</p>
            <form className="news luxury-news" onSubmit={subscribe}>
              <input name="email" type="email" placeholder="Your email address" aria-label="Email address" required />
              <button aria-label="Subscribe" title="Join Atelier Circle">→</button>
            </form>
            <span id="nmsg" role="status">{newsletterMessage}</span>

            <div className="footer-payment-badges">
              <span className="pay-tag">💵 Cash on Delivery</span>
              <span className="pay-tag">📱 JazzCash</span>
              <span className="pay-tag">📱 EasyPaisa</span>
              <span className="pay-tag">🏦 Bank IBFT</span>
              <span className="pay-tag">💳 Card</span>
            </div>
          </div>
        </div>

        <div className="footer-bottom-strip wrap">
          <p>© {new Date().getFullYear()} Maison Ihsaan Ali Haute Parfumerie. All rights reserved.</p>
          <div className="footer-bottom-links">
            <Link href="/policies#privacy">Privacy</Link>
            <span>·</span>
            <Link href="/policies#terms">Terms</Link>
            <span>·</span>
            <Link href="/policies#shipping">Delivery</Link>
          </div>
        </div>
      </footer>

      {/* Cart Drawer */}
      <div id="veil" className={drawerOpen ? "active" : ""} onClick={() => setDrawerOpen(false)} />
      <aside id="drawer" className={drawerOpen ? "active" : ""} aria-label="Cart" aria-hidden={!drawerOpen}>
        <div className="dh">
          <div className="dh-left">
            <h2>Your Scent Wardrobe</h2>
            <small>{itemCount} {itemCount === 1 ? "fragrance" : "fragrances"} in bag</small>
          </div>
          <button className="mini cap luxury-close-btn" type="button" onClick={() => setDrawerOpen(false)}>Close ✕</button>
        </div>

        {/* Free Shipping Meter */}
        <div className="drawer-shipping-meter">
          <div className="drawer-shipping-text">
            <span>🚚 Complimentary Nationwide Express Courier</span>
          </div>
          <div className="drawer-meter-bar">
            <div className="drawer-meter-fill" style={{ width: "100%" }} />
          </div>
        </div>

        <div id="items">
          {items.length ? items.map(({ product, quantity }) => (
            <div className="ci luxury-ci" key={product.id}>
              <Image src={product.img} alt="" width={74} height={82} unoptimized={product.img.startsWith("http")} style={{ objectFit: "contain", objectPosition: product.pos || "50% 50%" }} />
              <div className="luxury-ci-info">
                <Link href={`/product?id=${product.id}`} onClick={() => setDrawerOpen(false)} className="luxury-ci-title">
                  {product.name}
                </Link>
                <span className="luxury-ci-size">{product.size} · Extrait</span>
                <div className="luxury-qty-row">
                  <div className="luxury-qty-stepper">
                    <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity(product.id, quantity - 1)}>−</button>
                    <span>{quantity}</span>
                    <button type="button" aria-label="Increase quantity" onClick={() => setQuantity(product.id, quantity + 1)}>+</button>
                  </div>
                  <button className="cart-remove" type="button" onClick={() => setQuantity(product.id, 0)}>Remove</button>
                </div>
              </div>
              <b className="luxury-ci-price">{money(product.price * quantity)}</b>
            </div>
          )) : (
            <div className="empty luxury-empty-cart">
              <span className="empty-cart-icon">🧴</span>
              <p>Your fragrance bag is empty.</p>
              <Link className="btn cap" href="/shop" onClick={() => setDrawerOpen(false)}>
                Explore Velvet Smoke →
              </Link>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="drawer-footer-actions">
            <div className="tot luxury-tot">
              <span>Subtotal:</span>
              <b>{money(items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0))}</b>
            </div>
            <Link className="btn cap luxury-checkout-btn" href="/checkout" onClick={() => setDrawerOpen(false)}>
              <span>🔒 Proceed to Checkout</span>
              <span>→</span>
            </Link>
            <Link className="btn line cap luxury-view-cart-btn" href="/cart" onClick={() => setDrawerOpen(false)}>
              View Cart Details
            </Link>
            <div className="drawer-secure-note">
              <span>✓ 100% Authentic Guaranteed · Free Delivery across Pakistan</span>
            </div>
          </div>
        )}
      </aside>
      <div id="toast" className={toast ? "on" : ""} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
