"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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

  // Sync mobile sidebar drawer DOM with React state
  useEffect(() => {
    if (typeof document === "undefined") return;
    const drawer = document.getElementById("mobileNavDrawer");
    const veil = document.getElementById("mobileNavVeil");
    const btn = document.getElementById("menuBtn");
    if (menuOpen) {
      drawer?.classList.add("active");
      veil?.classList.add("active");
      btn?.classList.add("is-open");
      document.body.classList.add("modal-open");
    } else {
      drawer?.classList.remove("active");
      veil?.classList.remove("active");
      btn?.classList.remove("is-open");
      if (!drawerOpen) {
        document.body.classList.remove("modal-open");
      }
    }
  }, [menuOpen, drawerOpen]);
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
          <nav id="desktopNav" className="top-desktop-nav cap" aria-label="Desktop Navigation">
            <Link href="/shop">The Collection</Link>
            <Link href="/story">Our Story</Link>
            <Link href="/track">Live Tracking</Link>
            <Link href="/contact">Concierge</Link>
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
            <button
              id="menuBtn"
              type="button"
              className={`luxury-menu-btn ${menuOpen ? "is-open" : ""}`}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              aria-controls="mobileNavDrawer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((open) => !open);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((open) => !open);
              }}
            >
              <span aria-hidden="true" style={{ fontSize: menuOpen ? "22px" : "20px", display: "inline-block", lineHeight: 1, pointerEvents: "none" }}>
                {menuOpen ? "✕" : "☰"}
              </span>
            </button>
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

      {/* Mobile Navigation Sidebar Drawer & Veil */}
      <div
        id="mobileNavVeil"
        className={`mobile-nav-veil ${menuOpen ? "active" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside
        id="mobileNavDrawer"
        className={`mobile-nav-drawer ${menuOpen ? "active" : ""}`}
        aria-label="Navigation Menu"
        aria-hidden={!menuOpen}
      >
        {/* Mobile Sidebar Top Brand Bar with Close Button */}
        <div className="mobile-nav-top">
          <div className="mobile-nav-brand">
            <Image
              src="/assets/images/logo-ring.png"
              alt="Maison Ihsaan Ali"
              width={46}
              height={46}
              unoptimized
            />
            <div className="mobile-nav-brand-text">
              <span className="mobile-nav-brand-name">MAISON IHSAAN ALI</span>
              <span className="mobile-nav-brand-tag">HAUTE PARFUMERIE · GRASSE</span>
            </div>
          </div>
          <button
            type="button"
            className="mobile-nav-close-btn"
            aria-label="Close navigation sidebar"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="mobile-nav-body">
          <div className="mobile-nav-eyebrow">PARFUM ATELIER</div>
          <nav className="mobile-nav-list cap">
            <Link href="/shop" onClick={() => setMenuOpen(false)} className="mobile-nav-item">
              <span className="mobile-nav-item-icon">⚜️</span>
              <div className="mobile-nav-item-texts">
                <span className="mobile-nav-item-label">The Collection</span>
                <span className="mobile-nav-item-sub">All 3 Expressions</span>
              </div>
              <span className="mobile-nav-item-arrow">→</span>
            </Link>
            <Link href="/story" onClick={() => setMenuOpen(false)} className="mobile-nav-item">
              <span className="mobile-nav-item-icon">📜</span>
              <div className="mobile-nav-item-texts">
                <span className="mobile-nav-item-label">Our Story</span>
                <span className="mobile-nav-item-sub">Artisan Heritage</span>
              </div>
              <span className="mobile-nav-item-arrow">→</span>
            </Link>
            <Link href="/track" onClick={() => setMenuOpen(false)} className="mobile-nav-item">
              <span className="mobile-nav-item-icon">🚚</span>
              <div className="mobile-nav-item-texts">
                <span className="mobile-nav-item-label">Live Order Tracking</span>
                <span className="mobile-nav-item-sub">Nationwide Courier</span>
              </div>
              <span className="mobile-nav-item-arrow">→</span>
            </Link>
            <Link href="/contact" onClick={() => setMenuOpen(false)} className="mobile-nav-item">
              <span className="mobile-nav-item-icon">🏛️</span>
              <div className="mobile-nav-item-texts">
                <span className="mobile-nav-item-label">Client Concierge</span>
                <span className="mobile-nav-item-sub">Atelier Advisory</span>
              </div>
              <span className="mobile-nav-item-arrow">→</span>
            </Link>
          </nav>

          <div className="mobile-nav-separator" />

          <div className="mobile-nav-eyebrow">CLIENT SERVICES</div>
          <div className="mobile-nav-action-cards">
            <Link href="/account" onClick={() => setMenuOpen(false)} className="mobile-nav-card">
              <span className="card-symbol">♙</span>
              <span className="card-label">Account</span>
              <small className="card-badge">{user ? "Active" : "Sign In"}</small>
            </Link>
            <Link href="/wishlist" onClick={() => setMenuOpen(false)} className="mobile-nav-card">
              <span className="card-symbol">♡</span>
              <span className="card-label">Wishlist</span>
              <small className="card-badge">{wishlist.length} {wishlist.length === 1 ? "bottle" : "bottles"}</small>
            </Link>
            <button
              type="button"
              className="mobile-nav-card"
              onClick={() => {
                setMenuOpen(false);
                setDrawerOpen(true);
              }}
            >
              <span className="card-symbol">🛍️</span>
              <span className="card-label">Scent Bag</span>
              <small className="card-badge">{itemCount} {itemCount === 1 ? "bottle" : "bottles"}</small>
            </button>
          </div>

          <div className="mobile-nav-perks-card">
            <div className="mobile-perk-line">
              <span className="perk-bullet">✓</span>
              <span>100% Pure Extrait Concentrates</span>
            </div>
            <div className="mobile-perk-line">
              <span className="perk-bullet">✓</span>
              <span>Complimentary Nationwide Express</span>
            </div>
            <div className="mobile-perk-line">
              <span className="perk-bullet">✓</span>
              <span>Cash on Delivery · Card · JazzCash</span>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="mobile-nav-footer">
          <Link href="/contact" onClick={() => setMenuOpen(false)} className="mobile-nav-concierge-btn">
            <span>💬 Speak with Fragrance Concierge</span>
          </Link>
          <div className="mobile-nav-copyright">
            © {new Date().getFullYear()} Maison Ihsaan Ali Haute Parfumerie
          </div>
        </div>
      </aside>

      {/* Instant Native Mobile Drawer Controller (Zero-hydration dependency) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              function bindDrawer() {
                var btn = document.getElementById('menuBtn');
                var drawer = document.getElementById('mobileNavDrawer');
                var veil = document.getElementById('mobileNavVeil');
                if (!btn || !drawer || !veil || btn.__instantBound) return;
                btn.__instantBound = true;

                function toggle(e) {
                  if (e) {
                    if (e.cancelable) e.preventDefault();
                    e.stopPropagation();
                  }
                  var open = drawer.classList.contains('active');
                  if (open) {
                    drawer.classList.remove('active');
                    veil.classList.remove('active');
                    btn.classList.remove('is-open');
                    document.body.classList.remove('modal-open');
                  } else {
                    drawer.classList.add('active');
                    veil.classList.add('active');
                    btn.classList.add('is-open');
                    document.body.classList.add('modal-open');
                  }
                }

                btn.addEventListener('click', toggle);
                btn.addEventListener('touchend', function(e) { toggle(e); }, { passive: false });

                veil.addEventListener('click', function() {
                  drawer.classList.remove('active');
                  veil.classList.remove('active');
                  btn.classList.remove('is-open');
                  document.body.classList.remove('modal-open');
                });
                veil.addEventListener('touchend', function(e) {
                  if (e.cancelable) e.preventDefault();
                  drawer.classList.remove('active');
                  veil.classList.remove('active');
                  btn.classList.remove('is-open');
                  document.body.classList.remove('modal-open');
                }, { passive: false });

                var closeBtn = drawer.querySelector('.mobile-nav-close-btn');
                if (closeBtn) {
                  closeBtn.addEventListener('click', function() {
                    drawer.classList.remove('active');
                    veil.classList.remove('active');
                    btn.classList.remove('is-open');
                    document.body.classList.remove('modal-open');
                  });
                  closeBtn.addEventListener('touchend', function(e) {
                    if (e.cancelable) e.preventDefault();
                    drawer.classList.remove('active');
                    veil.classList.remove('active');
                    btn.classList.remove('is-open');
                    document.body.classList.remove('modal-open');
                  }, { passive: false });
                }

                var links = drawer.querySelectorAll('a, button:not(.mobile-nav-close-btn)');
                for (var i = 0; i < links.length; i++) {
                  links[i].addEventListener('click', function() {
                    drawer.classList.remove('active');
                    veil.classList.remove('active');
                    btn.classList.remove('is-open');
                    document.body.classList.remove('modal-open');
                  });
                }
              }

              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', bindDrawer);
              } else {
                bindDrawer();
              }
              setTimeout(bindDrawer, 50);
              setTimeout(bindDrawer, 300);
            })();
          `,
        }}
      />
      <div id="toast" className={toast ? "on" : ""} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
