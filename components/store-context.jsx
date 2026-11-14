"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { COUPONS, DEFAULT_CONTENT, PRODUCTS, SHIPPING, money } from "./catalog";

const StoreContext = createContext(null);
const STORAGE_PREFIX = "ihsaan-";

function readStorage(key, fallback) {
  try {
    const value = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function animateFlyToCart(eventOrElement, product) {
  if (typeof window === "undefined") return;

  const cartBtn = document.getElementById("cartBtn") || document.querySelector(".cartbtn");
  if (!cartBtn) return;

  let sourceEl = null;
  if (eventOrElement) {
    if (typeof eventOrElement.getBoundingClientRect === "function") {
      sourceEl = eventOrElement;
    } else if (eventOrElement.currentTarget) {
      sourceEl = eventOrElement.currentTarget;
    } else if (eventOrElement.target) {
      sourceEl = eventOrElement.target;
    }
  }

  if (!sourceEl && typeof window.event !== "undefined" && window.event?.target) {
    sourceEl = window.event.target;
  }

  let sourceRect = null;
  let imgSrc = product?.img || "";

  if (sourceEl) {
    const container = sourceEl.closest(".card, article, .pd, .product-layout, main");
    const imgEl = container ? container.querySelector("img") : null;
    if (imgEl) {
      sourceRect = imgEl.getBoundingClientRect();
      if (!imgSrc && imgEl.src) imgSrc = imgEl.src;
    } else {
      sourceRect = sourceEl.getBoundingClientRect();
    }
  }

  if (!sourceRect || sourceRect.width === 0 || sourceRect.height === 0) {
    sourceRect = {
      left: window.innerWidth / 2 - 40,
      top: window.innerHeight / 2 - 40,
      width: 80,
      height: 80,
    };
  }

  const targetRect = cartBtn.getBoundingClientRect();

  const flyer = document.createElement("div");
  flyer.className = "cart-flyer";

  const startW = Math.min(Math.max(sourceRect.width * 0.7, 80), 125);
  const startH = Math.min(Math.max(sourceRect.height * 0.7, 90), 140);
  const startX = sourceRect.left + sourceRect.width / 2 - startW / 2;
  const startY = sourceRect.top + sourceRect.height / 2 - startH / 2;

  flyer.style.left = `${startX}px`;
  flyer.style.top = `${startY}px`;
  flyer.style.width = `${startW}px`;
  flyer.style.height = `${startH}px`;

  if (imgSrc) {
    const img = document.createElement("img");
    img.src = imgSrc;
    img.alt = product?.name || "Product";
    flyer.appendChild(img);
  } else {
    flyer.innerHTML = '<span style="font-size: 26px;">✨</span>';
  }

  document.body.appendChild(flyer);

  const targetX = targetRect.left + targetRect.width / 2;
  const targetY = targetRect.top + targetRect.height / 2;
  const deltaX = targetX - (startX + startW / 2);
  const deltaY = targetY - (startY + startH / 2);

  const liftY = Math.min(-65, deltaY * 0.35 - 50);

  const keyframes = [
    {
      transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)",
      opacity: 1,
      boxShadow: "0 10px 25px rgba(201, 163, 106, 0.4)",
      offset: 0,
    },
    {
      transform: `translate3d(${deltaX * 0.12}px, ${liftY}px, 0) scale(1.22) rotate(-10deg)`,
      opacity: 1,
      boxShadow: "0 25px 50px rgba(201, 163, 106, 0.75), 0 0 20px rgba(228, 199, 145, 0.5)",
      offset: 0.28,
    },
    {
      transform: `translate3d(${deltaX * 0.62}px, ${deltaY * 0.42}px, 0) scale(0.72) rotate(12deg)`,
      opacity: 0.95,
      offset: 0.68,
    },
    {
      transform: `translate3d(${deltaX * 0.9}px, ${deltaY * 0.88}px, 0) scale(0.35) rotate(-4deg)`,
      opacity: 0.7,
      offset: 0.9,
    },
    {
      transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.08) rotate(0deg)`,
      opacity: 0.1,
      offset: 1,
    },
  ];

  const animation = flyer.animate(keyframes, {
    duration: 1250,
    easing: "cubic-bezier(0.25, 0.9, 0.3, 1)",
    fill: "forwards",
  });

  animation.onfinish = () => {
    flyer.remove();
    cartBtn.classList.remove("cart-bump");
    void cartBtn.offsetWidth;
    cartBtn.classList.add("cart-bump");
    setTimeout(() => {
      cartBtn.classList.remove("cart-bump");
    }, 750);
  };
}

export function StoreProvider({ children }) {
  const [cart, setCart] = useState({});
  const [wishlist, setWishlist] = useState([]);
  const [coupon, setCoupon] = useState(null);
  const [products, setProducts] = useState(PRODUCTS);
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [user, setUser] = useState(null);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setCart(readStorage("cart", {}));
    setWishlist(readStorage("wish", []));
    setCoupon(readStorage("coupon", null));
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Account service is unavailable.");
        if (!cancelled) {
          setAuthConfigured(result.configured === true);
          setUser(result.user || null);
          setAuthLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthConfigured(false);
          setUser(null);
          setAuthLoading(false);
          setToast("Local account service is unavailable. Check that MySQL is running.");
        }
      });
    return () => { cancelled = true; };
  }, []);

  const refreshStorefront = useCallback(async () => {
    const response = await fetch("/api/storefront");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Storefront content could not be loaded.");
    setProducts(result.products || PRODUCTS);
    setContent(result.content || DEFAULT_CONTENT);
  }, []);

  useEffect(() => {
    let cancelled = false;
    refreshStorefront().catch(() => {
      if (!cancelled) setToast("Live store content could not be loaded. Showing the saved preview.");
    });
    return () => { cancelled = true; };
  }, [refreshStorefront]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(`${STORAGE_PREFIX}cart`, JSON.stringify(cart));
      window.localStorage.setItem(`${STORAGE_PREFIX}wish`, JSON.stringify(wishlist));
      window.localStorage.setItem(`${STORAGE_PREFIX}coupon`, JSON.stringify(coupon));
    } catch {
      setToast("Your browser storage is full. Some changes may not be saved.");
    }
  }, [cart, wishlist, coupon, ready]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const productById = useCallback((id) => products.find((product) => product.id === id), [products]);

  const add = useCallback((id, quantity = 1, eventOrElement = null) => {
    const product = products.find((entry) => entry.id === id);
    if (!product || !product.stock) {
      setToast(product ? `${product.short} is sold out.` : "That product is unavailable.");
      return;
    }
    animateFlyToCart(eventOrElement, product);
    setCart((current) => {
      const next = Math.min((current[id] || 0) + quantity, product.stock);
      setToast(next < (current[id] || 0) + quantity ? `Only ${product.stock} in stock.` : `${product.short} added to cart.`);
      return { ...current, [id]: next };
    });
  }, [products]);

  const setQuantity = useCallback((id, quantity) => {
    const product = products.find((entry) => entry.id === id);
    if (!product) return;
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[id];
      else next[id] = Math.min(quantity, product.stock);
      return next;
    });
  }, [products]);

  const toggleWish = useCallback((id) => {
    setWishlist((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      setToast(next.includes(id) ? "Saved to your wishlist." : "Removed from your wishlist.");
      return next;
    });
  }, []);

  const applyCoupon = useCallback((code) => {
    const normalized = code.trim().toUpperCase();
    if (!COUPONS[normalized]) return false;
    setCoupon(normalized);
    setToast(`${COUPONS[normalized]}% discount applied.`);
    return true;
  }, []);

  const items = Object.entries(cart)
    .map(([id, quantity]) => ({ product: productById(id), quantity }))
    .filter(({ product, quantity }) => product && quantity > 0);
  const subtotal = items.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);
  const discount = coupon && COUPONS[coupon] ? Math.round((subtotal * COUPONS[coupon])) / 100 : 0;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const shippingCost = (method = "standard") => {
    const afterDiscount = subtotal - discount;
    if (!afterDiscount) return 0;
    return method === "express" ? SHIPPING.express : afterDiscount >= SHIPPING.freeOver ? 0 : SHIPPING.flat;
  };
  const total = (method = "standard") => subtotal - discount + shippingCost(method);

  const value = useMemo(
    () => ({
      cart,
      wishlist,
      coupon,
      products,
      content,
      productById,
      refreshStorefront,
      user,
      authConfigured,
      authLoading,
      ready,
      toast,
      items,
      itemCount,
      subtotal,
      discount,
      total,
      shippingCost,
      add,
      setQuantity,
      toggleWish,
      applyCoupon,
      setCart,
      setCoupon,
      setUser,
      setToast,
    }),
    [cart, wishlist, coupon, products, content, productById, refreshStorefront, user, authConfigured, authLoading, ready, toast, items, itemCount, subtotal, discount, add, setQuantity, toggleWish, applyCoupon],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider.");
  return context;
}

export { money, PRODUCTS, productById };
