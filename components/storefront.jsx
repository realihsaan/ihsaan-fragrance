"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_CONTENT, NOTES, PRODUCTS, SHIPPING, STAGES, money, productById as catalogProductById } from "./catalog";
import { useStore } from "./store-context";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pageClass = "inner";

function ProductCard({ product }) {
  const { add, wishlist, toggleWish } = useStore();
  const isWish = wishlist.includes(product.id);

  return (
    <article className="card luxury-card">
      <div className="im luxury-card-media">
        <Link href={`/product?id=${product.id}`} aria-label={`View ${product.name}`}>
          <Image
            src={product.img}
            alt={product.name}
            fill
            sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
            style={{ objectFit: "contain", objectPosition: product.pos || "50% 50%" }}
            className="luxury-card-img"
          />
        </Link>
        <div className="luxury-badge-stack">
          {!product.stock ? (
            <span className="badge sold-out">Sold out</span>
          ) : (
            <span className="luxury-concentration-badge">
              {product.id === "ext" ? "Extrait · 30%" : product.id === "edt" ? "EDT · Luminous" : "EDP · Signature"}
            </span>
          )}
        </div>
        <button
          className={`heart luxury-heart-btn ${isWish ? "is-active" : ""}`}
          type="button"
          aria-pressed={isWish}
          aria-label={`${isWish ? "Remove" : "Save"} ${product.short} ${isWish ? "from" : "to"} wishlist`}
          onClick={() => toggleWish(product.id)}
        >
          {isWish ? "♥" : "♡"}
        </button>
      </div>
      <div className="b luxury-card-body">
        <div className="luxury-card-meta">
          <span className="luxury-brand-eyebrow">Maison Ihsaan Ali</span>
          <span className="luxury-size-tag">{product.size}</span>
        </div>
        <h3 className="cap luxury-card-title">
          <Link href={`/product?id=${product.id}`}>
            Velvet Smoke <i>{product.short}</i>
          </Link>
        </h3>
        <p className="luxury-card-tag">{product.tag}</p>
        <div className="luxury-card-stars" aria-label="5 star rating">
          ★★★★★ <small>(4.9)</small>
        </div>
        <div className="row luxury-card-footer">
          <div className="luxury-price-wrap">
            <span className="luxury-price">{money(product.price)}</span>
            <small className="luxury-tax-note">Free Courier Delivery</small>
          </div>
          <button
            className="bag add-cart luxury-add-cart-btn"
            type="button"
            disabled={!product.stock}
            aria-label={`Add ${product.short} to cart`}
            onClick={(e) => add(product.id, 1, e)}
          >
            <svg className="i" aria-hidden="true" viewBox="0 0 24 24"><path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2" /></svg>
            <span>Add to bag</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductGrid({ products, empty = "No products found." }) {
  return products.length ? (
    <div className={`cards ${products.length === 1 ? "one" : products.length === 2 ? "two" : ""}`}>
      {products.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  ) : <p className="empty">{empty}</p>;
}

const FORMULATION_SPECS = {
  ext: {
    concentration: "Extrait de Parfum · 35% Pure French Concentrate",
    badge: "Pure Extrait · 35%",
    notesHighlight: "Smoky Birch, Ambergris, Rare Oud Absolue",
    sillage: "16+ Hours · Profound Sillage",
    mood: "Intense, Sultry & Nocturne",
  },
  edp: {
    concentration: "Eau de Parfum · 20% Parfum Oil",
    badge: "Signature EDP · 20%",
    notesHighlight: "Calabrian Bergamot, Crushed Pepper, Cedarwood",
    sillage: "10–12 Hours · Balanced Aura",
    mood: "Versatile, Charismatic & Magnetic",
  },
  edt: {
    concentration: "Eau de Toilette · 14% Luminous Blend",
    badge: "Luminous EDT · 14%",
    notesHighlight: "Sparkling Citrus, White Jasmine, Clean Sandalwood",
    sillage: "6–8 Hours · Radiant Crisp Trail",
    mood: "Fresh, Luminous & Effortless Daily",
  },
};

const PRODUCT_THEMES = {
  ext: {
    id: "ext",
    name: "Extrait de Parfum",
    primary: "#E6A838",
    highlight: "#FFD078",
    glow: "rgba(230, 168, 56, 0.65)",
    glowStrong: "rgba(230, 168, 56, 0.45)",
    glowSoft: "rgba(230, 168, 56, 0.22)",
    surface: "#332F2B",
    surfaceAlt: "#262320",
    border: "rgba(230, 168, 56, 0.55)",
    borderSoft: "rgba(230, 168, 56, 0.28)",
    badgeBg: "rgba(230, 168, 56, 0.18)",
    taglineColor: "#FFD078",
    btnGradient: "linear-gradient(135deg, #FFD078 0%, #E6A838 50%, #B87A1E 100%)",
    btnColor: "#1B1814",
    halo: "radial-gradient(circle, rgba(230, 168, 56, 0.48) 0%, rgba(230, 168, 56, 0.18) 50%, transparent 75%)",
  },
  edp: {
    id: "edp",
    name: "Eau de Parfum",
    primary: "#C5AB7A",
    highlight: "#DEC89C",
    glow: "rgba(197, 171, 122, 0.60)",
    glowStrong: "rgba(197, 171, 122, 0.40)",
    glowSoft: "rgba(197, 171, 122, 0.20)",
    surface: "#3B3A39",
    surfaceAlt: "#2A2928",
    border: "rgba(197, 171, 122, 0.55)",
    borderSoft: "rgba(197, 171, 122, 0.28)",
    badgeBg: "rgba(197, 171, 122, 0.16)",
    taglineColor: "#DEC89C",
    btnGradient: "linear-gradient(135deg, #DEC89C 0%, #C5AB7A 50%, #A18758 100%)",
    btnColor: "#262524",
    halo: "radial-gradient(circle, rgba(197, 171, 122, 0.45) 0%, rgba(197, 171, 122, 0.16) 50%, transparent 75%)",
  },
  edt: {
    id: "edt",
    name: "Eau de Toilette",
    primary: "#E8D5A3",
    highlight: "#FFF1CE",
    glow: "rgba(232, 213, 163, 0.68)",
    glowStrong: "rgba(232, 213, 163, 0.45)",
    glowSoft: "rgba(232, 213, 163, 0.22)",
    surface: "#323534",
    surfaceAlt: "#242726",
    border: "rgba(232, 213, 163, 0.55)",
    borderSoft: "rgba(232, 213, 163, 0.28)",
    badgeBg: "rgba(232, 213, 163, 0.18)",
    taglineColor: "#FFF1CE",
    btnGradient: "linear-gradient(135deg, #FFF1CE 0%, #E8D5A3 50%, #C4AE77 100%)",
    btnColor: "#1A1D1C",
    halo: "radial-gradient(circle, rgba(232, 213, 163, 0.48) 0%, rgba(232, 213, 163, 0.18) 50%, transparent 75%)",
  },
};

function LetterByLetter({ text, keyPrefix = "lbl", baseDelay = 0.04, step = 0.022, className = "" }) {
  if (!text) return null;
  const chars = Array.from(text);
  return (
    <span className={`letter-by-letter-stream ${className}`} aria-label={text}>
      {chars.map((ch, idx) => {
        const isSpace = ch === " ";
        return (
          <span
            key={`${keyPrefix}-${idx}`}
            aria-hidden="true"
            className={`letter-char ${isSpace ? "letter-space" : ""}`}
            style={{
              animationDelay: `${(baseDelay + idx * step).toFixed(3)}s`,
            }}
          >
            {isSpace ? "\u00A0" : ch}
          </span>
        );
      })}
    </span>
  );
}

function CollectionShowcase3D({ products, collectionCopy }) {
  const { add, wishlist, toggleWish } = useStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const [animatingFromIndex, setAnimatingFromIndex] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState("next");
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const hasMovedRef = useRef(false);

  const activeProduct = products[activeIndex] || products[0];
  const activeSpec = FORMULATION_SPECS[activeProduct?.id] || FORMULATION_SPECS.ext;
  const activeTheme = PRODUCT_THEMES[activeProduct?.id] || PRODUCT_THEMES.ext;

  const transitionTimerRef = useRef(null);

  const goTo = useCallback((nextIdx, dir = "next") => {
    if (nextIdx === activeIndex) return;
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    setDirection(dir);
    setAnimatingFromIndex(activeIndex);
    setActiveIndex(nextIdx);
    setIsTransitioning(true);
    transitionTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      setAnimatingFromIndex(null);
    }, 650);
  }, [activeIndex]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  const handleNext = useCallback(() => {
    goTo((activeIndex + 1) % products.length, "next");
  }, [activeIndex, goTo, products.length]);

  const handlePrev = useCallback(() => {
    goTo((activeIndex - 1 + products.length) % products.length, "prev");
  }, [activeIndex, goTo, products.length]);

  // Autoplay loop (5.5 seconds) with pause on hover or dragging
  useEffect(() => {
    if (isHovered || isDragging || isTransitioning || products.length <= 1) return undefined;
    const timer = setInterval(() => {
      handleNext();
    }, 5500);
    return () => clearInterval(timer);
  }, [handleNext, isHovered, isDragging, isTransitioning, products.length]);

  // Pointer drag gestures (Fluid, non-blocking mobile touch & mouse grab)
  const pointerStartPosRef = useRef({ x: 0, y: 0 });
  const isPointerInteractingRef = useRef(false);
  const isHorizontalDragRef = useRef(false);

  // Dedicated touch gesture handling for mobile screens
  const touchStartRef = useRef({ x: 0, y: 0 });
  const isTouchSwipingRef = useRef(false);

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    isTouchSwipingRef.current = false;
    hasMovedRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    const t = e.touches[0];
    const diffX = t.clientX - touchStartRef.current.x;
    const diffY = t.clientY - touchStartRef.current.y;

    if (!isTouchSwipingRef.current) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        if (Math.abs(diffX) > Math.abs(diffY)) {
          isTouchSwipingRef.current = true;
          hasMovedRef.current = true;
          setIsDragging(true);
        } else {
          return;
        }
      } else {
        return;
      }
    }

    if (isTouchSwipingRef.current) {
      setDragX(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (isTouchSwipingRef.current) {
      const movedX = dragX;
      setIsDragging(false);
      isTouchSwipingRef.current = false;
      if (Math.abs(movedX) > 25) {
        if (movedX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
      setDragX(0);
    }
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === "touch") return; // Touch handled by touch events
    if (e.button !== undefined && e.button !== 0) return;
    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    dragStartXRef.current = e.clientX;
    isPointerInteractingRef.current = true;
    isHorizontalDragRef.current = false;
    hasMovedRef.current = false;
  };

  const handlePointerMove = (e) => {
    if (!isPointerInteractingRef.current) {
      if (e.pointerType === "mouse") {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        setTilt({
          x: (x / (rect.width / 2)) * 10,
          y: -(y / (rect.height / 2)) * 10,
        });
      }
      return;
    }

    const diffX = e.clientX - pointerStartPosRef.current.x;
    const diffY = e.clientY - pointerStartPosRef.current.y;

    if (!isHorizontalDragRef.current) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        if (Math.abs(diffX) > Math.abs(diffY)) {
          isHorizontalDragRef.current = true;
          setIsDragging(true);
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch (err) {}
        } else {
          isPointerInteractingRef.current = false;
          setIsDragging(false);
          setDragX(0);
          return;
        }
      } else {
        return;
      }
    }

    if (isHorizontalDragRef.current) {
      if (Math.abs(diffX) > 10) {
        hasMovedRef.current = true;
      }
      setDragX(diffX);
    }
  };

  const handlePointerUp = (e) => {
    if (!isPointerInteractingRef.current && !isDragging) return;
    const wasDragging = isHorizontalDragRef.current || isDragging;
    isPointerInteractingRef.current = false;
    isHorizontalDragRef.current = false;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    // Flip threshold: 28px drag
    if (wasDragging && Math.abs(dragX) > 28) {
      if (dragX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    setDragX(0);
  };

  const handlePointerCancel = () => {
    isPointerInteractingRef.current = false;
    isHorizontalDragRef.current = false;
    setIsDragging(false);
    setDragX(0);
  };

  const handleMouseEnter = () => {
    if (typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setTilt({ x: 0, y: 0 });
      setIsHovered(false);
    }
  };

  if (!products.length) return null;

  return (
    <section className="luxury-collection-showcase-3d" aria-label="3D Fragrance Collection Showcase">
      <div className="wrap showcase-grid-layout">
        
        {/* Left Column: Dynamically Animated Perfume Story & Formulation Specs */}
        <div 
          className={`showcase-text-stage ${isTransitioning ? "is-transitioning" : "is-active"}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Quick Expression Switcher Tabs */}
          <div className="showcase-expression-nav" role="tablist" aria-label="Fragrance Expressions">
            {products.map((prod, idx) => {
              const isPillActive = idx === activeIndex;
              const pTheme = PRODUCT_THEMES[prod.id] || PRODUCT_THEMES.ext;
              return (
                <button
                  key={prod.id}
                  type="button"
                  role="tab"
                  aria-selected={isPillActive}
                  className={`expression-nav-pill ${isPillActive ? "is-active" : ""}`}
                  style={isPillActive ? {
                    borderColor: pTheme.border,
                    color: pTheme.highlight,
                    boxShadow: `0 4px 16px ${pTheme.glowSoft}`,
                  } : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goTo(idx, idx > activeIndex ? "next" : "prev");
                  }}
                >
                  <span className="pill-index">0{idx + 1}</span>
                  <span className="pill-name pill-name-desktop">{prod.short}</span>
                  <span className="pill-name pill-name-mobile">
                    {prod.id === "ext" ? "Extrait" : prod.id === "edp" ? "EDP" : "EDT"}
                  </span>
                  {isPillActive && (
                    <span className="pill-progress-indicator" style={{ background: pTheme.highlight }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Eyebrow with formulation tag and letter-by-letter reveal */}
          <div className="showcase-eyebrow-row">
            <span className="cap dk showcase-eyebrow" style={{ color: activeTheme.primary }}>
              <LetterByLetter
                key={`eyebrow-${activeProduct.id}`}
                text={`HAUTE PARFUMERIE · EXPRESSION 0${activeIndex + 1} OF 0${products.length}`}
                baseDelay={0.02}
                step={0.012}
              />
            </span>
            <span 
              className="showcase-badge-soft"
              style={{
                background: activeTheme.badgeBg,
                borderColor: activeTheme.border,
                color: activeTheme.highlight,
              }}
            >
              {activeSpec.concentration}
            </span>
          </div>

          {/* Dynamic Main Title: Letter-by-Letter 3D Flip Cascade with matching product gradient */}
          <h2 
            className="showcase-title"
            style={{
              "--title-grad": `linear-gradient(135deg, #FFFFFF 0%, ${activeTheme.highlight} 50%, ${activeTheme.primary} 100%)`,
            }}
          >
            <LetterByLetter
              key={`title-${activeProduct.id}`}
              text={activeProduct.name}
              baseDelay={0.06}
              step={0.024}
            />
          </h2>

          {/* Tagline: Letter-by-Letter Reveal */}
          <p className="showcase-tagline" style={{ color: activeTheme.taglineColor }}>
            “<LetterByLetter
              key={`tag-${activeProduct.id}`}
              text={activeProduct.tag}
              baseDelay={0.20}
              step={0.016}
            />”
          </p>

          {/* Formulation Description */}
          <p className="showcase-desc">
            {activeProduct.desc}
          </p>

          {/* Formulation Meta Specs with matching accent colors */}
          <div className="showcase-specs-grid" style={{ borderColor: activeTheme.borderSoft }}>
            <div className="showcase-spec-item">
              <span className="spec-label" style={{ color: activeTheme.primary }}>Flacon Architecture</span>
              <strong className="spec-value">{activeProduct.size} · Heavy French Glass</strong>
            </div>
            <div className="showcase-spec-item">
              <span className="spec-label" style={{ color: activeTheme.primary }}>Olfactory Signature</span>
              <strong className="spec-value">{activeSpec.notesHighlight}</strong>
            </div>
            <div className="showcase-spec-item">
              <span className="spec-label" style={{ color: activeTheme.primary }}>Longevity & Sillage</span>
              <strong className="spec-value">{activeSpec.sillage}</strong>
            </div>
            <div className="showcase-spec-item">
              <span className="spec-label" style={{ color: activeTheme.primary }}>Sensory Character</span>
              <strong className="spec-value">{activeSpec.mood}</strong>
            </div>
          </div>

          {/* Pricing & Call To Action matching product color scheme */}
          <div className="showcase-cta-row">
            <div className="showcase-price-box">
              <span className="price-label" style={{ color: activeTheme.primary }}>Price</span>
              <span className="showcase-big-price" style={{ color: activeTheme.primary }}>{money(activeProduct.price)}</span>
              <small className="price-sub" style={{ color: activeTheme.highlight }}>Free Nationwide Express Delivery</small>
            </div>
            <div className="showcase-cta-buttons">
              <button
                type="button"
                className="btn showcase-main-btn"
                disabled={!activeProduct.stock}
                style={{
                  background: activeTheme.btnGradient,
                  color: activeTheme.btnColor,
                  boxShadow: `0 4px 20px ${activeTheme.glowSoft}`,
                }}
                onClick={(e) => add(activeProduct.id, 1, e)}
              >
                <span>Add {activeProduct.short} to Bag</span>
              </button>
              <Link 
                href={`/product?id=${activeProduct.id}`} 
                className="btn line showcase-secondary-btn"
                style={{
                  borderColor: activeTheme.primary,
                  color: activeTheme.highlight,
                }}
              >
                <span>View Full Notes</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* Shop All Link */}
          <div className="showcase-shop-all-strip">
            <Link href="/shop" className="showcase-shop-all-link">
              <span>View all 3 expressions in the catalog</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* Right Column: 3D Perspective Floating Card Stage with Mouse Grab & 3D Flip */}
        <div 
          className={`showcase-3d-stage ${isDragging ? "is-user-dragging" : ""}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className="showcase-3d-viewport">
            {products.map((prod, idx) => {
              const count = products.length;
              let offset = idx - activeIndex;
              if (offset < -1) offset += count;
              if (offset > 1) offset -= count;

              const isCurrent = offset === 0;
              const isNext = offset === 1 || (activeIndex === count - 1 && idx === 0);
              const isPrev = offset === -1 || (activeIndex === 0 && idx === count - 1);
              const isIncoming = isTransitioning && idx === activeIndex;
              const isOutgoing = isTransitioning && idx === animatingFromIndex;

              const cardTheme = PRODUCT_THEMES[prod.id] || PRODUCT_THEMES.ext;
              const prodSpec = FORMULATION_SPECS[prod.id] || FORMULATION_SPECS.ext;
              const isProdWish = wishlist.includes(prod.id);

              let cardClass = "showcase-3d-card";
              let transformStyle = {};

              if (isDragging) {
                // Interactive real-time rotational drag around the 3D circle with Flip-Over dynamics
                if (isCurrent) {
                  cardClass += " is-center";
                  const dragRotY = tilt.x + (dragX / 160) * 75;
                  const dragShiftX = dragX * 0.65;
                  const dragShiftZ = 50 - Math.min(Math.abs(dragX) * 0.4, 50);
                  const dragScale = 1 - Math.min(Math.abs(dragX) / 1000, 0.08);
                  transformStyle = {
                    transform: `perspective(1200px) translateX(${dragShiftX}px) translateZ(${dragShiftZ}px) rotateY(${dragRotY}deg) rotateX(${tilt.y}deg) scale(${dragScale})`,
                    opacity: 1,
                    zIndex: 10,
                    transition: "none",
                    cursor: "grabbing",
                    borderColor: cardTheme.primary,
                    boxShadow: `0 35px 85px rgba(15, 14, 13, 0.9), 0 0 50px ${cardTheme.glow}`,
                  };
                } else if (isNext) {
                  cardClass += " is-next";
                  if (dragX < 0) {
                    const p = Math.min(Math.abs(dragX) / 200, 1);
                    const curX = 35 - p * 35;
                    const curZ = -90 + p * 140;
                    const curRot = -20 + p * 20;
                    const curScale = 0.82 + p * 0.18;
                    transformStyle = {
                      transform: `perspective(1200px) translateX(${curX}%) translateZ(${curZ}px) rotateY(${curRot}deg) scale(${curScale})`,
                      opacity: 0.6 + p * 0.4,
                      zIndex: p > 0.5 ? 9 : 5,
                      transition: "none",
                      cursor: "pointer",
                      borderColor: p > 0.5 ? cardTheme.primary : cardTheme.borderSoft,
                    };
                  } else {
                    transformStyle = {
                      transition: "none",
                      cursor: "pointer",
                      borderColor: cardTheme.borderSoft,
                    };
                  }
                } else if (isPrev) {
                  cardClass += " is-prev";
                  if (dragX > 0) {
                    const p = Math.min(dragX / 200, 1);
                    const curX = -35 + p * 35;
                    const curZ = -90 + p * 140;
                    const curRot = 20 - p * 20;
                    const curScale = 0.82 + p * 0.18;
                    transformStyle = {
                      transform: `perspective(1200px) translateX(${curX}%) translateZ(${curZ}px) rotateY(${curRot}deg) scale(${curScale})`,
                      opacity: 0.6 + p * 0.4,
                      zIndex: p > 0.5 ? 9 : 4,
                      transition: "none",
                      cursor: "pointer",
                      borderColor: p > 0.5 ? cardTheme.primary : cardTheme.borderSoft,
                    };
                  } else {
                    transformStyle = {
                      transition: "none",
                      cursor: "pointer",
                      borderColor: cardTheme.borderSoft,
                    };
                  }
                } else {
                  cardClass += " is-hidden";
                  transformStyle = {
                    pointerEvents: "none",
                  };
                }
              } else if (isTransitioning) {
                // True 3D Flip-Over animation state
                if (isIncoming) {
                  cardClass += direction === "next" ? " is-flipover-in-next" : " is-flipover-in-prev";
                  transformStyle = {
                    borderColor: cardTheme.primary,
                    boxShadow: `0 35px 85px rgba(15, 14, 13, 0.9), 0 0 50px ${cardTheme.glow}`,
                  };
                } else if (isOutgoing) {
                  cardClass += direction === "next" ? " is-flipover-out-next" : " is-flipover-out-prev";
                  transformStyle = {
                    borderColor: cardTheme.borderSoft,
                  };
                } else {
                  cardClass += offset > 0 ? " is-next" : " is-prev";
                  transformStyle = {
                    borderColor: cardTheme.borderSoft,
                  };
                }
              } else {
                // 3D Circular Cylinder Carousel at rest with individual matching color themes
                if (isCurrent) {
                  cardClass += " is-center";
                  transformStyle = {
                    transform: `perspective(1200px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) translateZ(50px) scale(1)`,
                    opacity: 1,
                    zIndex: 10,
                    cursor: "grab",
                    borderColor: cardTheme.primary,
                    boxShadow: `0 35px 85px rgba(15, 14, 13, 0.9), 0 0 50px ${cardTheme.glow}`,
                  };
                } else if (isNext) {
                  cardClass += " is-next";
                  transformStyle = {
                    cursor: "pointer",
                    borderColor: cardTheme.borderSoft,
                  };
                } else if (isPrev) {
                  cardClass += " is-prev";
                  transformStyle = {
                    cursor: "pointer",
                    borderColor: cardTheme.borderSoft,
                  };
                } else {
                  cardClass += " is-hidden";
                  transformStyle = {
                    pointerEvents: "none",
                  };
                }
              }

              return (
                <div
                  key={prod.id}
                  className={cardClass}
                  style={{
                    ...transformStyle,
                    "--card-primary": cardTheme.primary,
                    "--card-highlight": cardTheme.highlight,
                    "--card-glow": cardTheme.glow,
                    "--card-glow-strong": cardTheme.glowStrong,
                    "--card-glow-soft": cardTheme.glowSoft,
                    "--card-halo": cardTheme.halo,
                    "--card-border-soft": cardTheme.borderSoft,
                  }}
                  onClick={(e) => {
                    if (hasMovedRef.current) {
                      e.preventDefault();
                      return;
                    }
                    if (!isCurrent) goTo(idx, isNext ? "next" : "prev");
                  }}
                >
                  {/* Matching Product Ambient Halo Glow */}
                  <div 
                    className="showcase-card-ambient-glow" 
                    style={{ background: cardTheme.halo }}
                  />

                  {/* 3D Flip Light Reflection Sheen */}
                  <div className="showcase-card-flip-sheen" />

                  {/* Bottle Media Frame (Larger Card Architecture) */}
                  <div className="showcase-card-media">
                    <Link 
                      href={`/product?id=${prod.id}`}
                      tabIndex={isCurrent ? 0 : -1}
                      onClick={(e) => {
                        if (hasMovedRef.current) e.preventDefault();
                      }}
                    >
                      <Image
                        src={prod.img}
                        alt={prod.name}
                        fill
                        sizes="(max-width: 768px) 88vw, 480px"
                        style={{ objectFit: "contain" }}
                        priority={isCurrent}
                        className="showcase-bottle-img"
                      />
                    </Link>
                    <div className="showcase-card-badges">
                      <span 
                        className="showcase-badge-pill"
                        style={{
                          borderColor: cardTheme.border,
                          color: cardTheme.highlight,
                          background: cardTheme.badgeBg,
                        }}
                      >
                        {prodSpec.badge}
                      </span>
                      <span className="showcase-size-tag">{prod.size}</span>
                    </div>
                    <button
                      className={`heart showcase-heart-btn ${isProdWish ? "is-active" : ""}`}
                      type="button"
                      aria-label={`${isProdWish ? "Remove" : "Save"} ${prod.short} to wishlist`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWish(prod.id);
                      }}
                    >
                      {isProdWish ? "♥" : "♡"}
                    </button>
                  </div>

                  {/* Card Info Overlay with matching product color scheme */}
                  <div className="showcase-card-info">
                    <div className="showcase-card-name-row">
                      <h3>{prod.name}</h3>
                      <span className="showcase-card-price" style={{ color: cardTheme.primary }}>
                        {money(prod.price)}
                      </span>
                    </div>
                    <p className="showcase-card-tag" style={{ color: cardTheme.highlight }}>
                      {prod.tag}
                    </p>
                    <div className="showcase-card-actions">
                      <button
                        type="button"
                        className="btn showcase-quick-add-btn"
                        disabled={!prod.stock}
                        style={{
                          background: cardTheme.btnGradient,
                          color: cardTheme.btnColor,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          add(prod.id, 1, e);
                        }}
                      >
                        <svg className="i" aria-hidden="true" viewBox="0 0 24 24" style={{ width: 14, height: 14, fill: "currentColor" }}>
                          <path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2" />
                        </svg>
                        <span>Add to bag</span>
                      </button>
                      <Link 
                        href={`/product?id=${prod.id}`}
                        className="btn line showcase-quick-inspect"
                        style={{
                          borderColor: cardTheme.border,
                          color: cardTheme.highlight,
                        }}
                        onClick={(e) => {
                          if (hasMovedRef.current) e.preventDefault();
                          else e.stopPropagation();
                        }}
                      >
                        Inspect
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mouse Drag & Swipe Instruction Hint */}
          <div className="showcase-drag-hint" aria-hidden="true">
            <span className="drag-hint-icon">‹‹</span>
            <span className="drag-hint-text">Drag with mouse to flip expressions</span>
            <span className="drag-hint-icon">››</span>
          </div>

          {/* Mobile Direct Tap Flip Arrows */}
          <div className="showcase-mobile-nav-arrows" aria-label="Fragrance carousel navigation">
            <button
              type="button"
              className="showcase-mobile-arrow showcase-arrow-prev"
              aria-label="Previous fragrance"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
            >
              ‹
            </button>
            <span className="showcase-mobile-counter">
              0{activeIndex + 1} / 0{products.length}
            </span>
            <button
              type="button"
              className="showcase-mobile-arrow showcase-arrow-next"
              aria-label="Next fragrance"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
            >
              ›
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}

function HomePage() {
  const { products, content } = useStore();
  const fragranceProducts = products.filter((product) => product.type === "fragrance");
  const heroCopy = { ...DEFAULT_CONTENT.hero_copy, ...content.hero_copy };
  const collectionCopy = { ...DEFAULT_CONTENT.collection_copy, ...content.collection_copy };
  const lifestyleCopy = { ...DEFAULT_CONTENT.lifestyle_copy, ...content.lifestyle_copy };
  const heroMedia = { ...DEFAULT_CONTENT.hero_image, ...content.hero_image };
  const lifestyleMedia = { ...DEFAULT_CONTENT.lifestyle_image, ...content.lifestyle_image };
  const [homeReviews, setHomeReviews] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(products.map(async (product) => {
      try {
        const response = await fetch(`/api/reviews?productId=${encodeURIComponent(product.id)}`);
        const result = await response.json();
        return (result.reviews || []).map((r) => ({ ...r, productName: product.short }));
      } catch {
        return [];
      }
    })).then((all) => {
      if (!cancelled) {
        const flat = all.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHomeReviews(flat.slice(0, 3));
      }
    });
    return () => { cancelled = true; };
  }, [products]);

  return (
    <main className="luxury-home-main">
      {/* Cinematic Hero */}
      <section className="hero luxury-hero">
        <Image
          className="heroimg"
          src={heroMedia.image}
          alt={heroMedia.alt}
          width={2169}
          height={725}
          priority
          sizes="100vw"
          unoptimized={heroMedia.image.startsWith("http")}
        />
        {heroMedia.video && (
          <video className="hero-video" autoPlay muted loop playsInline preload="metadata" poster={heroMedia.image} aria-hidden="true">
            <source src={heroMedia.video} type="video/mp4" />
          </video>
        )}

        <div className="copy luxury-hero-copy">
          <div className="luxury-hero-badge">
            <span className="badge-flair">⚜️</span>
            <span className="cap gold">HAUTE PARFUMERIE · PARIS / LAHORE</span>
          </div>
          <h1>{heroCopy.heading}</h1>
          <p>{heroCopy.body}</p>
          <div className="luxury-hero-actions">
            <Link className="btn cap luxury-primary-btn" href={heroCopy.button_href}>
              <span>{heroCopy.button_text}</span>
              <span className="btn-arrow" aria-hidden="true">→</span>
            </Link>
            <Link className="btn line cap luxury-secondary-btn" href="/story">
              <span>The Atelier Story</span>
            </Link>
          </div>

          <div className="luxury-hero-perks">
            <span>⚜️ French Grasse Concentrates</span>
            <span className="perk-bullet">·</span>
            <span>⏳ 14+ Hour Sillage</span>
            <span className="perk-bullet">·</span>
            <span>🚚 Free Nationwide Courier</span>
          </div>
        </div>
      </section>

      {/* Haute Parfumerie Brand Trust Pillars */}
      <section className="luxury-pillars-strip wrap" aria-label="Artisanal Standards">
        <div className="luxury-pillar-card">
          <span className="pillar-icon">⚜️</span>
          <div className="pillar-text">
            <strong>French Grasse Concentrates</strong>
            <p>Macerated with pure floral, amber, and resin absolutes from France for unrivaled depth.</p>
          </div>
        </div>
        <div className="luxury-pillar-card">
          <span className="pillar-icon">⏳</span>
          <div className="pillar-text">
            <strong>14+ Hour Beast Longevity</strong>
            <p>High Extrait oil concentration formulated to project with magnetic sillage through day and night.</p>
          </div>
        </div>
        <div className="luxury-pillar-card">
          <span className="pillar-icon">📦</span>
          <div className="pillar-text">
            <strong>Bespoke Velvet Coffret</strong>
            <p>Delivered in our signature magnetic presentation coffret with certificate of authenticity.</p>
          </div>
        </div>
        <div className="luxury-pillar-card">
          <span className="pillar-icon">🚚</span>
          <div className="pillar-text">
            <strong>Nationwide Express Courier</strong>
            <p>Insured courier delivery across Pakistan with verified Cash on Delivery & IBFT.</p>
          </div>
        </div>
      </section>

      {/* 3D Interactive Animated Fragrance Collection Showcase */}
      <CollectionShowcase3D products={fragranceProducts} collectionCopy={collectionCopy} />

      {/* The Olfactory Notes Pyramid Section */}
      <section className="luxury-notes-pyramid-section" aria-labelledby="notes-pyramid-title">
        <div className="wrap">
          <div className="notes-pyramid-header">
            <span className="cap gold">THE OLFACTORY ARCHITECTURE</span>
            <h2 id="notes-pyramid-title">The Anatomy of Velvet Smoke</h2>
            <p>An evolving sensory progression composed with high-grade perfume absolutes.</p>
          </div>

          <div className="notes-pyramid-grid">
            <div className="pyramid-tier-card tier-top">
              <div className="tier-tag">
                <span className="tier-time">Opening · First 30 Mins</span>
                <h3>Top Notes</h3>
              </div>
              <p className="tier-desc">A sparkling, invigorating aura that captures attention immediately.</p>
              <div className="tier-notes-pills">
                <span className="note-pill">🌿 Calabrian Bergamot</span>
                <span className="note-pill">✨ Pink Peppercorn</span>
                <span className="note-pill">🍃 Elemi Resin</span>
              </div>
            </div>

            <div className="pyramid-tier-card tier-heart">
              <div className="tier-tag">
                <span className="tier-time">Heart · Hours 1 to 4</span>
                <h3>Heart Notes</h3>
              </div>
              <p className="tier-desc">The opulent, seductive floral-woody core that defines your signature trail.</p>
              <div className="tier-notes-pills">
                <span className="note-pill">🌸 Moroccan Jasmine</span>
                <span className="note-pill">🪵 Smoked Birch Wood</span>
                <span className="note-pill">🌫️ Sacred Incense</span>
              </div>
            </div>

            <div className="pyramid-tier-card tier-base">
              <div className="tier-tag">
                <span className="tier-time">Drydown · Hours 5 to 14+</span>
                <h3>Base Notes</h3>
              </div>
              <p className="tier-desc">The intoxicating, warm foundation that clings intimately to skin and fabric.</p>
              <div className="tier-notes-pills">
                <span className="note-pill">👑 Ambergris Gold</span>
                <span className="note-pill">🪵 Creamy Sandalwood</span>
                <span className="note-pill">🖤 Noir Musk</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lifestyle Cinematic Showcase */}
      <section className="lifestyle luxury-lifestyle-section">
        <div className="lifestyle-media">
          <Image
            className="lifestyle-poster"
            src={lifestyleMedia.image}
            alt={lifestyleMedia.alt}
            width={2169}
            height={725}
            sizes="(max-width: 700px) 100vw, 55vw"
            unoptimized={lifestyleMedia.image.startsWith("http")}
          />
          {lifestyleMedia.video && (
            <video className="lifestyle-video" autoPlay muted loop playsInline preload="metadata" poster={lifestyleMedia.image} aria-hidden="true">
              <source src={lifestyleMedia.video} type="video/mp4" />
            </video>
          )}
        </div>
        <div className="lifestyle-copy luxury-lifestyle-copy">
          <span className="cap dk luxury-section-eyebrow">{lifestyleCopy.eyebrow}</span>
          <h2>{lifestyleCopy.heading}</h2>
          <p>{lifestyleCopy.body}</p>
          <div className="lifestyle-quote-box">
            <blockquote>“A fragrance is not an accessory. It is the invisible aura that introduces you before you speak, and lingers long after you depart.”</blockquote>
            <cite>— Maison Ihsaan Ali Atelier</cite>
          </div>
          <Link className="btn line cap luxury-lifestyle-btn" href={lifestyleCopy.button_href}>
            <span>{lifestyleCopy.button_text}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* Authentic Client Reviews (Dynamically loaded from database) */}
      <section className="luxury-client-praise-section wrap" aria-label="Customer Reviews">
        <div className="praise-section-header">
          <span className="cap gold">CLIENT REFLECTIONS</span>
          <h2>Words from Fragrance Patrons</h2>
          <p style={{ color: "#d8c8b0", maxWidth: 640, margin: "10px auto 0", fontSize: 16 }}>
            Genuine experiences from clients who have worn Maison Ihsaan Ali. Every review is authentic and moderated before publishing.
          </p>
        </div>
        {homeReviews.length > 0 ? (
          <div className="praise-cards-grid">
            {homeReviews.map((review) => (
              <article className="praise-card" key={review.id}>
                <div className="praise-stars">{"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}</div>
                <blockquote>&ldquo;{review.text}&rdquo;</blockquote>
                <div className="praise-author">
                  <strong>{review.name}</strong>
                  <small>{review.verifiedPurchase ? "✓ Verified Buyer" : "Fragrance Patron"} · {review.productName || "Velvet Smoke"}</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 24px", background: "rgba(24, 17, 11, 0.7)", border: "1px solid rgba(201, 163, 106, 0.22)", borderRadius: 10, maxWidth: 640, margin: "30px auto 0" }}>
            <p style={{ color: "#ebdcc4", fontSize: 17, lineHeight: 1.6, margin: "0 0 18px" }}>
              Every bottle carries a story. After experiencing Velvet Smoke, share your reflections directly on the fragrance page.
            </p>
            <Link href="/shop" className="btn cap">Explore The Collection</Link>
          </div>
        )}
      </section>
    </main>
  );
}

function ShopPage() {
  const { products: storeProducts } = useStore();
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("feat");
  const [inStock, setInStock] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery(new URLSearchParams(window.location.search).get("q") || "");
  }, []);

  const products = useMemo(() => {
    const term = query.toLowerCase();
    const result = storeProducts.filter((product) =>
      (filter === "all" || product.type === filter) &&
      (!inStock || product.stock > 0) &&
      (!term || `${product.name} ${product.tag} ${product.desc}`.toLowerCase().includes(term)),
    );
    if (sort === "lo") result.sort((a, b) => a.price - b.price);
    if (sort === "hi") result.sort((a, b) => b.price - a.price);
    return result;
  }, [filter, inStock, query, sort, storeProducts]);

  return (
    <main className={`${pageClass} wrap page`}>
      <span className="cap dk">The collection</span>
      <h1 className="ph">Shop Velvet Smoke</h1>
      <p className="lead">{query ? `Results for “${query}”` : "Explore the available expressions of Velvet Smoke."}</p>
      <div className="filters">
        {[["all", "All"], ["fragrance", "Fragrances"], ["set", "Sets"]].map(([value, label]) => (
          <button key={value} className="chip cap" type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
        ))}
        <label><input type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} /> In stock only</label>
        <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="feat">Featured</option><option value="lo">Price: low to high</option><option value="hi">Price: high to low</option>
        </select>
      </div>
      <ProductGrid products={products} empty="Nothing matches your filters. Browse the full collection." />
    </main>
  );
}

function ProductPage() {
  const [product, setProduct] = useState(PRODUCTS[0]);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsLoadError, setReviewsLoadError] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const { add, wishlist, toggleWish, user, authLoading, productById: getProductById, products } = useStore();

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    const selected = getProductById(id) || PRODUCTS[0];
    setProduct(selected);
    const controller = new AbortController();
    setReviewsLoading(true);
    fetch(`/api/reviews?productId=${encodeURIComponent(selected.id)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Reviews are temporarily unavailable.");
        setReviews(result.reviews || []);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setReviews([]);
          setReviewsLoadError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setReviewsLoading(false);
      });
    return () => controller.abort();
  }, [getProductById]);

  useEffect(() => {
    setProduct((current) => getProductById(current.id) || current);
  }, [getProductById]);

  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length : 0;
  async function submitReview(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const review = {
      text: form.get("text").toString().trim(),
      stars: Number(form.get("stars")),
    };
    if (!review.text) {
      setReviewMessage("Add a few words about the fragrance.");
      return;
    }
    setReviewSubmitting(true);
    setReviewMessage("");
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, ...review }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your review could not be submitted.");
      setReviewMessage(result.message || "Thanks! Your review will appear after admin approval.");
      formElement.reset();
    } catch (error) {
      setReviewMessage(error.message || "Your review could not be submitted. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: `https://maisonihsaanali.com${product.img}`,
    description: product.desc,
    sku: `MIA-${product.id.toUpperCase()}`,
    brand: {
      "@type": "Brand",
      name: "Maison Ihsaan Ali",
    },
    offers: {
      "@type": "Offer",
      url: `https://maisonihsaanali.com/product?id=${product.id}`,
      priceCurrency: "PKR",
      price: product.price,
      priceValidUntil: "2027-12-31",
      availability: product.stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "Maison Ihsaan Ali",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: reviews.length ? average.toFixed(1) : "5.0",
      reviewCount: Math.max(1, reviews.length).toString(),
      bestRating: "5",
      worstRating: "1",
    },
  };

  return (
    <main className={`${pageClass} wrap page luxury-product-page`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <div className="pd luxury-pd-grid">
        <div className="im luxury-pd-media">
          <Image
            src={product.img}
            alt={product.name}
            width={900}
            height={1000}
            priority
            sizes="(max-width: 1100px) 100vw, 50vw"
            style={{ objectPosition: product.pos || "50% 50%" }}
            className="luxury-pd-main-img"
          />
          <button
            className={`heart luxury-heart-btn ${wishlist.includes(product.id) ? "is-active" : ""}`}
            type="button"
            aria-pressed={wishlist.includes(product.id)}
            aria-label="Toggle wishlist"
            onClick={() => toggleWish(product.id)}
          >
            {wishlist.includes(product.id) ? "♥" : "♡"}
          </button>
        </div>

        <div className="luxury-pd-info">
          <div className="luxury-pd-badges">
            <span className="luxury-concentration-pill">
              {product.id === "ext" ? "EXTRAIT DE PARFUM · 30% OIL RATIO" :
               product.id === "edt" ? "EAU DE TOILETTE · LUMINOUS CITRUS" :
               "EAU DE PARFUM · SIGNATURE WARM AMBER"}
            </span>
            <span className="luxury-size-pill">{product.size}</span>
          </div>

          <h1 className="ph luxury-pd-title">{product.name}</h1>

          <div className="luxury-pd-rating-strip">
            <span className="stars">
              {reviews.length
                ? "★".repeat(Math.round(average)) + "☆".repeat(5 - Math.round(average))
                : "★★★★★"}
            </span>
            <span className="rating-score">
              {reviews.length ? `${average.toFixed(1)} / 5.0` : "5.0 / 5.0"}
            </span>
            <a href="#reviews" className="rating-count">
              {reviews.length
                ? `(${reviews.length} Verified Client ${reviews.length === 1 ? "Review" : "Reviews"})`
                : "(Be the first to review)"}
            </a>
          </div>

          <div className="price luxury-pd-price">{money(product.price)}</div>
          <p className="lead luxury-pd-desc">{product.desc}</p>

          {/* Scent Performance Gauges */}
          <div className="luxury-performance-gauges">
            <div className="gauge-item">
              <span className="gauge-label">Longevity:</span>
              <div className="gauge-bar-wrap" title="12 - 14+ Hours">
                <div className="gauge-bar-fill" style={{ width: "95%" }} />
              </div>
              <strong className="gauge-value">12 - 14+ Hours</strong>
            </div>

            <div className="gauge-item">
              <span className="gauge-label">Sillage / Trail:</span>
              <div className="gauge-bar-wrap" title="Strong & Enveloping">
                <div className="gauge-bar-fill" style={{ width: "88%" }} />
              </div>
              <strong className="gauge-value">Magnetic Trail</strong>
            </div>
          </div>

          {/* Olfactory Notes Grid */}
          <div className="luxury-pd-notes-box">
            <h4>Olfactory Architecture</h4>
            <div className="luxury-pd-notes-grid">
              <div className="note-card">
                <span className="note-tier-label">TOP NOTES</span>
                <p>{NOTES.top}</p>
              </div>
              <div className="note-card">
                <span className="note-tier-label">HEART NOTES</span>
                <p>{NOTES.heart}</p>
              </div>
              <div className="note-card">
                <span className="note-tier-label">BASE NOTES</span>
                <p>{NOTES.base}</p>
              </div>
            </div>
          </div>

          {/* Purchasing actions */}
          <div className="buy luxury-buy-row">
            <div className="stepper luxury-stepper">
              <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
              <span>{quantity}</span>
              <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(product.stock || 1, value + 1))}>+</button>
            </div>
            <button
              className="btn cap luxury-add-cart-large"
              type="button"
              disabled={!product.stock}
              onClick={(e) => add(product.id, quantity, e)}
            >
              <span>{product.stock ? `Add to Bag · ${money(product.price * quantity)}` : "Sold Out"}</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>

          {/* Guarantees Strip */}
          <div className="luxury-pd-perks">
            <div className="pd-perk-item">
              <span>🚚</span>
              <div>
                <strong>Free Express Courier</strong>
                <small>Delivery in 2–4 business days across Pakistan</small>
              </div>
            </div>
            <div className="pd-perk-item">
              <span>📦</span>
              <div>
                <strong>Bespoke Coffret Box</strong>
                <small>Sealed presentation packaging with certificate</small>
              </div>
            </div>
            <div className="pd-perk-item">
              <span>💵</span>
              <div>
                <strong>Cash on Delivery & IBFT</strong>
                <small>Pay safely at your doorstep or via JazzCash/Bank</small>
              </div>
            </div>
          </div>
        </div>
      </div>
      <section className="more" id="reviews">
        <h2 style={{ fontSize: 36 }}>Reviews</h2>
        <div className="review-list">
          {reviewsLoading ? <p className="empty" role="status">Loading reviews…</p> : reviewsLoadError ? <p className="notice" role="alert">Reviews are temporarily unavailable. Please try again later.</p> : reviews.length ? reviews.map((review) => (
            <article className="review-card" key={review.id}>
              <div className="review-card-heading"><span className="stars">{"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}</span>{review.verifiedPurchase && <span className="review-verified">Verified purchase</span>}</div>
              <b>{review.name}</b><p>{review.text}</p>
            </article>
          )) : <p className="empty">Be the first to review this fragrance.</p>}
        </div>
        <section className="f review-form" style={{ maxWidth: 560, marginTop: 20 }}>
          <h3 style={{ fontWeight: 500, fontSize: 26, margin: 0 }}>Write a review</h3>
          {authLoading ? <p className="notice" role="status">Checking your account…</p> : user?.role === "customer" ? (
            <form onSubmit={submitReview}>
              <p className="review-author">Reviewing as <b>{user.user_metadata?.full_name || user.email}</b></p>
              <label>Rating<select name="stars"><option value="5">5 – Excellent</option><option value="4">4 – Very good</option><option value="3">3 – Good</option><option value="2">2 – Fair</option><option value="1">1 – Poor</option></select></label>
              <label>Your review<textarea name="text" rows="3" maxLength="2000" required /></label>
              <p className="status-message" role="status">{reviewMessage}</p>
              <button className="btn cap" disabled={reviewSubmitting}>{reviewSubmitting ? "Submitting…" : "Submit review"}</button>
            </form>
          ) : <><p className="notice">{user ? "Reviews can only be submitted from a customer account. Sign out and use your customer account to continue." : "Sign in or create an account to leave a review. Your name is linked automatically, so reviews can be attributed correctly."}</p><Link className="btn cap" href="/account">{user ? "Go to customer account" : "Sign in to review"}</Link></>}
        </section>
      </section>
      <section className="more"><h2 style={{ fontSize: 36 }}>You may also like</h2><ProductGrid products={products.filter((item) => item.id !== product.id).slice(0, 2)} /></section>
    </main>
  );
}

function CartPage() {
  const { items, setQuantity, subtotal, shippingCost, total } = useStore();
  const afterDiscount = subtotal;
  const remaining = Math.max(0, SHIPPING.freeOver - afterDiscount);
  return (
    <main className={`${pageClass} wrap page`}>
      <h1 className="ph">Your cart</h1>
      <div className="cartgrid">
        <section>
          {items.length ? items.map(({ product, quantity }) => (
            <div className="ci" key={product.id}>
              <Image src={product.img} alt={product.name} width={70} height={78} style={{ objectFit: "contain" }} />
              <div><Link href={`/product?id=${product.id}`}>{product.name}</Link><div className="qty"><button type="button" aria-label="Decrease quantity" onClick={() => setQuantity(product.id, quantity - 1)}>−</button>{quantity}<button type="button" aria-label="Increase quantity" onClick={() => setQuantity(product.id, quantity + 1)}>+</button></div><button className="cart-remove" type="button" onClick={() => setQuantity(product.id, 0)}>Remove</button></div>
              <b>{money(product.price * quantity)}</b>
            </div>
          )) : <p className="empty">Your cart is empty. <Link className="ul" href="/shop">Browse the collection</Link>.</p>}
        </section>
        {items.length > 0 && (
          <aside className="sum">
            <p>{remaining ? `Add ${money(remaining)} more for free shipping.` : "You’ve unlocked free standard shipping."}</p>
            <div className="bar2"><i style={{ width: `${Math.min(100, afterDiscount / SHIPPING.freeOver * 100)}%` }} /></div>
            <div className="rw"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="rw"><span>Shipping</span><span>{shippingCost() ? money(shippingCost()) : "Free"}</span></div>
            <div className="rw t"><span>Total</span><b>{money(total())}</b></div>
            <p className="notice">Have a discount code? Enter it securely during Stripe Checkout.</p>
            <Link className="btn cap" href="/checkout">Checkout</Link>
          </aside>
        )}
      </div>
    </main>
  );
}

function CheckoutPage() {
  const { items, subtotal, shippingCost, total, user, authLoading, authConfigured, coupon, setCart, setCoupon } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hasWhatsapp, setHasWhatsapp] = useState(true);
  const [diffWhatsapp, setDiffWhatsapp] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [address, setAddress] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Pakistan");
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [cardAvailable, setCardAvailable] = useState(false);
  const [bankDetails, setBankDetails] = useState(null);

  // Extra payment details
  const [paymentReference, setPaymentReference] = useState("");
  const [jazzcashMobile, setJazzcashMobile] = useState("");
  const [jazzcashCnic, setJazzcashCnic] = useState("");
  const [easypaisaMobile, setEasypaisaMobile] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  useEffect(() => {
    if (user) {
      if (user.user_metadata?.full_name) setName(user.user_metadata.full_name);
      if (user.email) setEmail(user.email);
      if (user.user_metadata?.phone) setPhone(user.user_metadata.phone);
    }
    if (new URLSearchParams(window.location.search).has("cancelled")) {
      setError("Checkout was cancelled. Your cart is still here when you’re ready.");
    }
    fetch("/api/checkout")
      .then((response) => response.json())
      .then((result) => {
        setCardAvailable(result.cardPaymentsAvailable === true);
        if (result.bankDetails) setBankDetails(result.bankDetails);
      })
      .catch(() => setCardAvailable(false));
  }, [user]);

  async function beginCheckout(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || user?.user_metadata?.full_name,
          email: email || user?.email,
          phone,
          hasWhatsapp,
          whatsappNumber: hasWhatsapp && diffWhatsapp ? whatsappNumber : (hasWhatsapp ? phone : ""),
          address,
          address2,
          city,
          region,
          postalCode,
          country,
          coupon,
          paymentMethod,
          paymentReference,
          jazzcashMobile,
          jazzcashCnic,
          easypaisaMobile,
          items: items.map(({ product, quantity }) => ({ id: product.id, quantity })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn’t start checkout.");
      if (paymentMethod === "stripe") {
        if (!result.url || new URL(result.url).hostname !== "checkout.stripe.com") {
          throw new Error("Secure checkout returned an unexpected destination.");
        }
        window.location.assign(result.url);
      } else {
        setConfirmedOrder(result);
        setCart({});
        setCoupon(null);
      }
    } catch (checkoutError) {
      setError(checkoutError.message || "Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (confirmedOrder) {
    const isCod = confirmedOrder.paymentMethod === "cash_on_delivery";
    const isBank = confirmedOrder.paymentMethod === "bank_transfer";
    const isWallet = confirmedOrder.paymentMethod === "jazzcash" || confirmedOrder.paymentMethod === "easypaisa";

    return (
      <main className={`${pageClass} wrap page`}>
        <span className="cap dk">Order Confirmed</span>
        <h1 className="ph">Thank you for your order</h1>
        <p className="lead">
          Your order number is <b>{confirmedOrder.orderId}</b>. A confirmation email with receipt has been sent to <b>{email || user?.email}</b>.
        </p>

        {isBank && (
          <div className="notice" style={{ margin: "24px 0", padding: "20px", background: "#fcf8f0", border: "1px solid #d9c9a8" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "18px", textTransform: "uppercase", letterSpacing: "1px" }}>Direct Bank Transfer (IBFT) Details</h3>
            <p style={{ margin: "0 0 10px" }}>Please transfer the order total of <b>{money(confirmedOrder.total / 100)}</b> to our bank account:</p>
            <ul style={{ margin: "0 0 12px", paddingLeft: "20px", lineHeight: "1.8" }}>
              <li><strong>Bank Name:</strong> {bankDetails?.bankName || "Meezan Bank Ltd"}</li>
              <li><strong>Account Title:</strong> {bankDetails?.accountTitle || "Maison Ihsaan Ali Pvt Ltd"}</li>
              <li><strong>Account Number:</strong> {bankDetails?.accountNumber || "01020304050607"}</li>
              <li><strong>IBAN:</strong> {bankDetails?.iban || "PK65MEZN0001020304050607"}</li>
              <li><strong>Branch:</strong> {bankDetails?.branch || "DHA Phase 5, Lahore"}</li>
            </ul>
            {confirmedOrder.paymentReference ? (
              <p style={{ margin: "8px 0 0", color: "#2d6a4f" }}>
                Recorded Reference ID: <strong>{confirmedOrder.paymentReference}</strong>
              </p>
            ) : (
              <p style={{ margin: "8px 0 0", color: "#666", fontSize: "14px" }}>
                Please keep your bank transfer receipt ready for quick verification by our concierge team.
              </p>
            )}
          </div>
        )}

        {isWallet && (
          <div className="notice" style={{ margin: "24px 0", padding: "20px", background: "#f4f9f4", border: "1px solid #c2e0c6" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px" }}>
              {confirmedOrder.paymentMethod === "jazzcash" ? "JazzCash" : "EasyPaisa"} Payment Processed
            </h3>
            <p style={{ margin: 0 }}>
              Transaction Reference: <strong>{confirmedOrder.paymentReference || "Verified"}</strong>
              <br />Status: <strong>Payment Approved</strong>
            </p>
          </div>
        )}

        {isCod && (
          <p className="lead" style={{ marginTop: 14 }}>
            Please have <b>{money(confirmedOrder.total / 100)}</b> ready in cash upon delivery.
          </p>
        )}

        <div style={{ marginTop: 28, display: "flex", gap: "14px", flexWrap: "wrap" }}>
          <Link className="btn cap" href={`/track?order=${encodeURIComponent(confirmedOrder.orderId)}`}>
            Track order <span>→</span>
          </Link>
          <Link className="btn line cap" href="/shop">
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className={`${pageClass} wrap page`}>
        <h1 className="ph">Checkout</h1>
        <p className="empty">Your cart is empty. <Link className="ul" href="/shop">Browse the collection</Link>.</p>
      </main>
    );
  }

  if (authLoading) {
    return (
      <main className={`${pageClass} wrap page`}>
        <h1 className="ph">Checkout</h1>
        <p className="notice" role="status">Preparing secure checkout…</p>
      </main>
    );
  }

  return (
    <main className={`${pageClass} wrap page`}>
      <h1 className="ph">Checkout</h1>
      <div className="cartgrid">
        <form className="f checkout-form" onSubmit={beginCheckout}>
          <section className="checkout-section" aria-labelledby="checkout-contact-heading">
            <div className="checkout-section-heading">
              <span className="checkout-step">01</span>
              <h2 id="checkout-contact-heading">Contact information</h2>
            </div>
            <div className="checkout-fields">
              {user ? (
                <div className="checkout-account-details checkout-full" style={{ padding: "14px 18px", background: "#3B3A39", border: "1px solid rgba(197, 171, 122, 0.35)", borderRadius: "8px", marginBottom: "12px" }}>
                  <div><span style={{ color: "#DEC89C", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Signed in as: </span><b style={{ color: "#F5EFE6" }}>{user.user_metadata?.full_name || "Customer"} ({user.email})</b></div>
                  <Link href="/account" style={{ fontSize: "13px", color: "#C5AB7A", textDecoration: "underline" }}>Manage account</Link>
                </div>
              ) : (
                <div className="checkout-full" style={{ fontSize: "14px", color: "#DEC89C", marginBottom: "12px" }}>
                  Already have an account? <Link className="ul" href="/account?next=%2Fcheckout" style={{ color: "#DEC89C" }}><strong>Sign in</strong></Link> or continue as guest below.
                </div>
              )}

              {!user && (
                <>
                  <label className="checkout-full">
                    Full name
                    <input
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Ihsaan Ali"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </label>
                  <label className="checkout-full">
                    Email address (for order receipt)
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="e.g. name@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </label>
                </>
              )}

              <label className="checkout-full">
                Phone number (for delivery courier)
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="03XXXXXXXXX"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                  minLength="7"
                  maxLength="50"
                />
              </label>

              <div className="checkout-full checkout-whatsapp-card">
                <label className="checkout-whatsapp-check">
                  <input
                    type="checkbox"
                    checked={hasWhatsapp}
                    onChange={(event) => {
                      setHasWhatsapp(event.target.checked);
                      if (!event.target.checked) setDiffWhatsapp(false);
                    }}
                  />
                  <span className="checkout-whatsapp-label">
                    <span className="checkout-whatsapp-title">💬 WhatsApp available on this number</span>
                    <small>Receive order confirmation & courier tracking updates directly on WhatsApp</small>
                  </span>
                </label>

                {hasWhatsapp && (
                  <div className="checkout-whatsapp-diff-wrap">
                    <label className="checkout-whatsapp-diff-toggle">
                      <input
                        type="checkbox"
                        checked={diffWhatsapp}
                        onChange={(event) => setDiffWhatsapp(event.target.checked)}
                      />
                      <span>My WhatsApp number is different from my calling number</span>
                    </label>

                    {diffWhatsapp && (
                      <input
                        type="tel"
                        className="checkout-whatsapp-diff-input"
                        placeholder="Enter your WhatsApp number (03XXXXXXXXX)"
                        value={whatsappNumber}
                        onChange={(event) => setWhatsappNumber(event.target.value)}
                        required={diffWhatsapp}
                        minLength="7"
                        maxLength="50"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="checkout-section" aria-labelledby="checkout-delivery-heading">
            <div className="checkout-section-heading">
              <span className="checkout-step">02</span>
              <h2 id="checkout-delivery-heading">Delivery address</h2>
            </div>
            <div className="checkout-fields">
              <label className="checkout-full">Address line 1<input autoComplete="address-line1" placeholder="House / Flat / Street" value={address} onChange={(event) => setAddress(event.target.value)} required /></label>
              <label className="checkout-full">Address line 2 (optional)<input autoComplete="address-line2" placeholder="Apartment, suite, unit, building" value={address2} onChange={(event) => setAddress2(event.target.value)} /></label>
              <label>City<input autoComplete="address-level2" placeholder="e.g. Lahore / Karachi / Islamabad" value={city} onChange={(event) => setCity(event.target.value)} required /></label>
              <label>Province / Region (optional)<input autoComplete="address-level1" placeholder="e.g. Punjab / Sindh" value={region} onChange={(event) => setRegion(event.target.value)} /></label>
              <label>Postal code (optional)<input autoComplete="postal-code" placeholder="e.g. 54000" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} /></label>
              <label>Country<input autoComplete="country-name" value={country} onChange={(event) => setCountry(event.target.value)} required /></label>
            </div>
          </section>

          <section className="checkout-section" aria-labelledby="checkout-payment-heading">
            <div className="checkout-section-heading">
              <span className="checkout-step">03</span>
              <h2 id="checkout-payment-heading">Payment method</h2>
            </div>
            <fieldset className="checkout-payment">
              <legend>Select payment method</legend>
              
              <label>
                <input type="radio" name="payment" value="cash_on_delivery" checked={paymentMethod === "cash_on_delivery"} onChange={() => setPaymentMethod("cash_on_delivery")} />
                <span>Cash on Delivery (COD)</span>
              </label>

              <label>
                <input type="radio" name="payment" value="bank_transfer" checked={paymentMethod === "bank_transfer"} onChange={() => setPaymentMethod("bank_transfer")} />
                <span>Direct Bank Transfer (IBFT)</span>
              </label>
              {paymentMethod === "bank_transfer" && (
                <div style={{ margin: "10px 0 16px 26px", padding: "16px", background: "#262524", border: "1px solid rgba(197, 171, 122, 0.35)", borderRadius: "8px", fontSize: "14px", color: "#F5EFE6" }}>
                  <p style={{ margin: "0 0 8px", fontWeight: "bold", color: "#DEC89C", fontSize: "15px" }}>Our Bank Account Details:</p>
                  <p style={{ margin: "0 0 5px", color: "#C5AB7A" }}><b style={{ color: "#F5EFE6" }}>Bank:</b> {bankDetails?.bankName || "Meezan Bank Ltd"}</p>
                  <p style={{ margin: "0 0 5px", color: "#C5AB7A" }}><b style={{ color: "#F5EFE6" }}>Account Title:</b> {bankDetails?.accountTitle || "Maison Ihsaan Ali Pvt Ltd"}</p>
                  <p style={{ margin: "0 0 5px", color: "#C5AB7A" }}><b style={{ color: "#F5EFE6" }}>Account No:</b> {bankDetails?.accountNumber || "01020304050607"}</p>
                  <p style={{ margin: "0 0 10px", color: "#C5AB7A" }}><b style={{ color: "#F5EFE6" }}>IBAN:</b> {bankDetails?.iban || "PK65MEZN0001020304050607"}</p>
                  <label style={{ display: "block", marginTop: "12px", color: "#DEC89C" }}>
                    Transaction ID / Reference Number (optional)
                    <input
                      type="text"
                      placeholder="e.g. IBFT-12345678"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      style={{ marginTop: "6px" }}
                    />
                  </label>
                </div>
              )}

              <label>
                <input type="radio" name="payment" value="jazzcash" checked={paymentMethod === "jazzcash"} onChange={() => setPaymentMethod("jazzcash")} />
                <span>JazzCash Mobile Account</span>
              </label>
              {paymentMethod === "jazzcash" && (
                <div style={{ margin: "10px 0 16px 26px", padding: "16px", background: "#262524", border: "1px solid rgba(197, 171, 122, 0.35)", borderRadius: "8px", fontSize: "14px", color: "#F5EFE6" }}>
                  <label style={{ display: "block", marginBottom: "10px", color: "#DEC89C" }}>
                    JazzCash Registered Mobile Number
                    <input
                      type="tel"
                      placeholder="03XXXXXXXXX"
                      value={jazzcashMobile}
                      onChange={(e) => setJazzcashMobile(e.target.value)}
                      required
                      style={{ marginTop: "6px" }}
                    />
                  </label>
                  <label style={{ display: "block", color: "#DEC89C" }}>
                    Last 6 digits of CNIC (optional for Sandbox)
                    <input
                      type="text"
                      placeholder="123456"
                      maxLength="6"
                      value={jazzcashCnic}
                      onChange={(e) => setJazzcashCnic(e.target.value)}
                      style={{ marginTop: "6px" }}
                    />
                  </label>
                </div>
              )}

              <label>
                <input type="radio" name="payment" value="easypaisa" checked={paymentMethod === "easypaisa"} onChange={() => setPaymentMethod("easypaisa")} />
                <span>EasyPaisa Mobile Account</span>
              </label>
              {paymentMethod === "easypaisa" && (
                <div style={{ margin: "10px 0 16px 26px", padding: "16px", background: "#262524", border: "1px solid rgba(197, 171, 122, 0.35)", borderRadius: "8px", fontSize: "14px", color: "#F5EFE6" }}>
                  <label style={{ display: "block", color: "#DEC89C" }}>
                    EasyPaisa Registered Mobile Number
                    <input
                      type="tel"
                      placeholder="03XXXXXXXXX"
                      value={easypaisaMobile}
                      onChange={(e) => setEasypaisaMobile(e.target.value)}
                      required
                      style={{ marginTop: "6px" }}
                    />
                  </label>
                </div>
              )}

              {cardAvailable && (
                <label>
                  <input type="radio" name="payment" value="stripe" checked={paymentMethod === "stripe"} onChange={() => setPaymentMethod("stripe")} />
                  <span>Credit / Debit Card (Stripe)</span>
                </label>
              )}
            </fieldset>
            <p className="checkout-payment-note">All transactions are encrypted and processed through secure authenticated channels.</p>
          </section>

          <div className="checkout-actions">
            <p className="status-message" role="alert">{error}</p>
            <button className="btn cap" disabled={loading}>
              {loading ? "Processing your order…" :
               paymentMethod === "stripe" ? "Continue to card payment" :
               paymentMethod === "bank_transfer" ? "Confirm bank transfer order" :
               paymentMethod === "jazzcash" ? "Pay with JazzCash" :
               paymentMethod === "easypaisa" ? "Pay with EasyPaisa" :
               "Place Cash on Delivery order"}
            </button>
          </div>
        </form>
        <aside className="sum checkout-summary">
          <h2 className="checkout-summary-title">Order summary</h2>
          {items.map(({ product, quantity }) => (
            <div className="rw" key={product.id}>
              <span>{product.short} × {quantity}</span>
              <span>{money(product.price * quantity)}</span>
            </div>
          ))}
          <div className="rw"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="rw"><span>Standard shipping</span><span>{shippingCost() ? money(shippingCost()) : "Free"}</span></div>
          <div className="rw t"><span>Total payable</span><b>{money(total())}</b></div>
        </aside>
      </div>
    </main>
  );
}

function WishlistPage() {
  const { wishlist, productById: getProductById } = useStore();
  return <main className={`${pageClass} wrap page`}><span className="cap dk">Saved</span><h1 className="ph">Your wishlist</h1><div style={{ marginTop: 24 }}><ProductGrid products={wishlist.map(getProductById).filter(Boolean)} empty="Your wishlist is empty. Tap the heart on a fragrance to save it." /></div></main>;
}

function OrderPage() {
  const [sessionId, setSessionId] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [isNew, setIsNew] = useState(false);
  const { productById: getProductById } = useStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSessionId(params.get("session_id") || "");
    setIsNew(params.has("new"));
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    async function loadOrder() {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
          const response = await fetch(`/api/orders/session?session_id=${encodeURIComponent(sessionId)}`);
          const result = await response.json();
          if (response.status === 202) {
            if (attempt === 9) throw new Error("Payment is confirmed; your order is still processing. Refresh this page shortly.");
            await new Promise((resolve) => setTimeout(resolve, 1200));
            continue;
          }
          if (!response.ok) throw new Error(result.error || "We couldn’t load this order.");
          if (!cancelled) setOrder(result);
          return;
        } catch (loadError) {
          if (!cancelled) setError(loadError.message || "We couldn’t load this order.");
          return;
        }
      }
      if (!cancelled) setError("Payment is confirmed; your order is still processing. Refresh this page shortly.");
    }
    loadOrder();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (!sessionId) return <main className={`${pageClass} wrap page`}><h1 className="ph">Order lookup</h1><p className="empty">Use the order tracking page to look up an order. <Link className="ul" href="/track">Track an order</Link>.</p></main>;
  if (!order) return <main className={`${pageClass} wrap page`}><p className={error ? "notice" : "empty"} role={error ? "alert" : "status"}>{error || "Confirming your payment and preparing your order…"}</p></main>;
  const stageIndex = order.status === "delivered" ? 3 : order.status === "shipped" ? 2 : order.status === "packed" ? 1 : 0;

  return (
    <main className={`${pageClass} wrap page`}>
      <span className="cap dk">{isNew ? "Thank you" : "Order details"}</span>
      <h1 className="ph">{order.status === "refunded" ? "Your payment was refunded" : isNew ? "Your order is confirmed" : `Order ${order.id}`}</h1>
      <p className="lead">Order <b>{order.id}</b> · {new Date(order.createdAt).toLocaleString()}</p>
      <p className="lead">Your order is linked to your customer account. Sign in there to follow delivery progress.</p>
      {order.status === "refunded" ? <p className="notice">We were unable to reserve all items, so your payment has been refunded. Please contact the store if you need help.</p> : (
        <>
          <div className="tl cap">{STAGES.map((stage, index) => <div key={stage} className={index <= stageIndex ? "on" : ""}>{stage}</div>)}</div>
          <section className="sum" style={{ maxWidth: 680 }}>
            <h2 style={{ fontSize: 30 }}>Items</h2>
            {order.items.map((item) => {
              const product = getProductById(item.product_id) || catalogProductById(item.product_id);
              return <div className="rw" key={item.product_id}><span>{product?.name || "Store product"} × {item.quantity}</span><span>{money(item.total_cents / 100)}</span></div>;
            })}
            <div className="rw t"><span>Total paid</span><b>{money(order.total / 100)}</b></div>
          </section>
          {order.statusHistory?.length > 0 && (
            <ol className="order-status-history">
              {order.statusHistory.map((event) => <li key={`${event.status}-${event.created_at}`}><b>{event.status.replaceAll("_", " ")}</b><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time></li>)}
            </ol>
          )}
        </>
      )}
      <p className="notice" style={{ marginTop: 22 }}>A receipt will be sent to the email address entered at checkout.</p>
    </main>
  );
}

const TRACKING_STEPS = [
  { key: "pending", label: "Placed", icon: "⏳", progress: 10, note: "Order placed" },
  { key: "paid", label: "Confirmed", icon: "💳", progress: 32, note: "Payment verified" },
  { key: "packed", label: "Packed", icon: "📦", progress: 55, note: "Packed & sealed" },
  { key: "shipped", label: "Dispatched", icon: "🚚", progress: 78, note: "In transit" },
  { key: "delivered", label: "Delivered", icon: "✅", progress: 100, note: "Delivered" },
];

function getStageIndex(status) {
  switch (status) {
    case "pending": return 0;
    case "paid": return 1;
    case "packed": return 2;
    case "shipped": return 3;
    case "delivered": return 4;
    default: return 0;
  }
}

function getStatusMessage(status, customerName) {
  const name = customerName ? customerName.split(" ")[0] : "Valued Customer";
  switch (status) {
    case "pending":
      return `Assalam-o-Alaikum ${name}! Your order has been placed and is currently awaiting fulfillment at our atelier.`;
    case "paid":
      return `Payment confirmed! Your order is queued for fragrance bottling and luxury packaging.`;
    case "packed":
      return `Your fragrance has been handcrafted, sealed and securely packaged in our signature box. Waiting for courier pickup.`;
    case "shipped":
      return `Your parcel is on the way! Our courier partner is delivering your package to your doorstep.`;
    case "delivered":
      return `Delivered! We hope you love wearing your Maison Ihsaan Ali signature fragrance.`;
    case "refunded":
      return `This order was cancelled or refunded. Please contact our client care if you need any assistance.`;
    default:
      return `Your order status is ${status ? status.replaceAll("_", " ") : "processing"}.`;
  }
}

function TrackPage() {
  const { user, authLoading, productById: getProductById } = useStore();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ordersList, setOrdersList] = useState([]);
  const [activeOrderId, setActiveOrderId] = useState("");

  const activeOrder = useMemo(() => {
    if (!ordersList.length) return null;
    return ordersList.find((o) => o.id === activeOrderId) || ordersList[0];
  }, [ordersList, activeOrderId]);

  const performLookup = useCallback(async ({ queryVal, idVal, emailVal }) => {
    const q = (queryVal !== undefined ? queryVal : "").trim();
    const id = (idVal !== undefined ? idVal : "").trim().toUpperCase();
    const em = (emailVal !== undefined ? emailVal : "").trim().toLowerCase();

    if (!q && !id && !em) {
      setError("Please enter your Tracking Number (e.g. IH070C77B7FA) or your Email address.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          orderId: id,
          email: em,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Order not found.");

      const list = result.orders || (result.id ? [result] : []);
      if (!list.length) throw new Error("No orders found matching your search.");

      setOrdersList(list);
      if (id) {
        const found = list.find((o) => o.id === id);
        setActiveOrderId(found ? found.id : list[0].id);
      } else {
        setActiveOrderId(list[0].id);
      }
    } catch (lookupError) {
      setError(lookupError.message || "We couldn’t look up this order.");
      setOrdersList([]);
      setActiveOrderId("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialOrder = params.get("order") || params.get("id") || "";
    const initialEmail = params.get("email") || "";

    if (initialOrder || initialEmail) {
      const initialVal = initialOrder || initialEmail;
      setQuery(initialVal);
      performLookup({ idVal: initialOrder, emailVal: initialEmail, queryVal: initialVal });
    } else if (user && user.email) {
      setQuery(user.email);
      performLookup({ emailVal: user.email, queryVal: user.email });
    }
  }, [user, performLookup]);

  function handleSearch(event) {
    if (event) event.preventDefault();
    performLookup({ queryVal: query });
  }

  const currentStageIndex = activeOrder ? getStageIndex(activeOrder.status) : 0;
  const currentStageConfig = TRACKING_STEPS[currentStageIndex] || TRACKING_STEPS[0];

  return (
    <main className={`${pageClass} wrap page`}>
      <div className="track-header-block">
        <span className="cap dk">REAL-TIME FULFILMENT TRACKING</span>
        <h1 className="ph">Track your fragrance order</h1>
        <p className="lead">
          Track by <b>Tracking Number</b> (e.g. IH070C77B7FA) or by <b>Email Address</b>. Neither is strictly required together — you can look up by either one!
        </p>
      </div>

      {/* Modern Search Bar */}
      <form className="track-search-card" onSubmit={handleSearch}>
        <div className="track-search-input-wrap">
          <span className="track-search-icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            className="track-search-input"
            placeholder="Enter Order Tracking ID (e.g. IH070C77B7FA) or Email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />
          {query && (
            <button
              type="button"
              className="track-clear-btn"
              onClick={() => {
                setQuery("");
                setError("");
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        <button className="btn cap track-search-submit" type="submit" disabled={loading}>
          {loading ? "Searching…" : "Track status →"}
        </button>
      </form>

      {error && (
        <div className="track-alert-card" role="alert">
          <span className="track-alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Multi-Order Selector (Shown when customer has multiple orders) */}
      {ordersList.length > 1 && (
        <section className="track-multi-orders-section">
          <div className="track-multi-header">
            <div>
              <h3>Found {ordersList.length} orders for your search</h3>
              <p>Click on any order below to view its live status progress bar.</p>
            </div>
            <span className="track-multi-badge">{ordersList.length} orders</span>
          </div>

          <div className="track-orders-selector-grid">
            {ordersList.map((ord) => {
              const isSelected = ord.id === activeOrder?.id;
              const firstItem = ord.items?.[0];
              const itemCount = ord.items?.reduce((sum, i) => sum + (i.quantity || 1), 0) || 1;

              return (
                <button
                  key={ord.id}
                  type="button"
                  className={`track-order-card-btn ${isSelected ? "is-selected" : ""}`}
                  onClick={() => setActiveOrderId(ord.id)}
                >
                  <div className="track-card-btn-top">
                    <span className="track-card-id">{ord.id}</span>
                    <span className={`track-card-status status-${ord.status}`}>
                      <i className="track-status-dot" />
                      {ord.status === "pending" ? "Pending" :
                       ord.status === "paid" ? "Confirmed" :
                       ord.status === "packed" ? "Packed" :
                       ord.status === "shipped" ? "Shipped" :
                       ord.status === "delivered" ? "Delivered" :
                       ord.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="track-card-btn-middle">
                    <span className="track-card-item-name">
                      {firstItem?.product_name || "Velvet Smoke"}
                      {itemCount > 1 && ` (+${itemCount - 1} more)`}
                    </span>
                    <b className="track-card-price">{money((ord.total || 0) / 100)}</b>
                  </div>

                  <div className="track-card-btn-footer">
                    <time dateTime={ord.createdAt}>
                      {new Date(ord.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </time>
                    <span className="track-card-action">
                      {isSelected ? "Currently viewing ✓" : "View bar →"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Slim Tracking Module with Live Status Bar */}
      {activeOrder && (
        <section className="track-slim-card" aria-label={`Tracking for Order ${activeOrder.id}`}>
          {/* Slim Header */}
          <div className="track-slim-topbar">
            <div className="track-slim-id-wrap">
              <span className="track-eyebrow">LIVE FULFILMENT STATUS</span>
              <h2>Order #{activeOrder.id}</h2>
              <time dateTime={activeOrder.createdAt}>
                Placed on {new Date(activeOrder.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </time>
            </div>

            <div className="track-slim-badges-wrap">
              <span className={`track-status-pill status-${activeOrder.status}`}>
                <span className="track-pill-pulse" />
                {activeOrder.status === "pending" ? "⏳ Fulfillment: Order Placed" :
                 activeOrder.status === "paid" ? "💳 Fulfillment: Confirmed" :
                 activeOrder.status === "packed" ? "📦 Fulfillment: Packed" :
                 activeOrder.status === "shipped" ? "🚚 Fulfillment: Dispatched" :
                 activeOrder.status === "delivered" ? "✅ Fulfillment: Delivered" :
                 activeOrder.status.replaceAll("_", " ")}
              </span>

              <span className={`track-payment-status-pill pay-${activeOrder.paymentStatus || "pending"}`}>
                {activeOrder.paymentStatus === "paid" ? "✅ Payment: Paid & Verified" :
                 activeOrder.paymentStatus === "submitted" ? "🔍 Payment: Slip Under Verification" :
                 activeOrder.paymentMethod === "cash_on_delivery" ? `💵 Cash on Delivery (Payable to Rider: Rs. ${((activeOrder.total || 0) / 100).toLocaleString()})` :
                 "⏳ Payment: Pending"}
              </span>

              {activeOrder.courierCn && (
                <span className="track-courier-pill">
                  📦 {activeOrder.courierName || "Courier"}: <b>{activeOrder.courierCn}</b>
                </span>
              )}
            </div>
          </div>

          {/* The Slim Visual Status Bar */}
          <div className="track-slim-progress-wrapper">
            <div className="track-progress-track">
              <div
                className="track-progress-fill"
                style={{ width: `${currentStageConfig.progress}%` }}
              >
                {/* Animated Moving Shipping Van */}
                <div className="track-animated-van-wrapper" title={`Current Stage: ${currentStageConfig.label}`}>
                  <div className="track-animated-van">
                    <span className="track-van-smoke" aria-hidden="true">💨</span>
                    <span className="track-van-icon" aria-hidden="true">🚚</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="track-steps-row">
              {TRACKING_STEPS.map((step, idx) => {
                const isDone = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                const isFuture = idx > currentStageIndex;

                const historyEvent = (activeOrder.statusHistory || []).find((h) => h.status === step.key);

                return (
                  <div
                    key={step.key}
                    className={`track-step-item ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""} ${isFuture ? "is-future" : ""}`}
                  >
                    <div className="track-step-node">
                      <span className="track-node-icon">
                        {isDone ? "✓" : step.icon}
                      </span>
                      {isCurrent && <span className="track-node-halo" />}
                    </div>
                    <div className="track-step-info">
                      <strong>{step.label}</strong>
                      <small>
                        {historyEvent
                          ? new Date(historyEvent.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
                          : step.note}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Status Message Banner */}
          <div className={`track-status-message-banner status-${activeOrder.status}`}>
            <span className="track-message-icon">
              {activeOrder.status === "pending" ? "⏳" :
               activeOrder.status === "paid" ? "💳" :
               activeOrder.status === "packed" ? "📦" :
               activeOrder.status === "shipped" ? "🚚" :
               activeOrder.status === "delivered" ? "✅" : "ℹ️"}
            </span>
            <p>{getStatusMessage(activeOrder.status, activeOrder.customerName)}</p>
          </div>

          {/* Dual Completed Confirmation Banner */}
          {activeOrder.status === "delivered" && activeOrder.paymentStatus === "paid" && (
            <div className="track-complete-celebration-banner">
              <span className="track-celebration-icon">🎉</span>
              <div>
                <strong>Order Delivery & Payment 100% Completed!</strong>
                <p>Your luxury package has been safely delivered and payment is confirmed & settled. Thank you for choosing Maison Ihsaan Ali.</p>
              </div>
            </div>
          )}

          {/* Collapsible Order Items & Details */}
          <details className="track-details-accordion" open>
            <summary>
              <span>Package Items & Delivery Details ({(activeOrder.items || []).length} items)</span>
              <b>Total: {money((activeOrder.total || 0) / 100)}</b>
            </summary>

            <div className="track-accordion-content">
              <div className="track-items-grid">
                {(activeOrder.items || []).map((item) => {
                  const product = getProductById(item.product_id) || catalogProductById(item.product_id);
                  const imageSrc = item.product_img || product?.img || "/assets/images/product-eau-de-parfum.jpg";
                  return (
                    <div className="track-item-card" key={item.product_id}>
                      <img src={imageSrc} alt="" className="track-item-thumb" />
                      <div className="track-item-info">
                        <b>{item.product_name || product?.name || "Velvet Smoke"}</b>
                        <small>{product?.size || "50 ml"} · Qty: {item.quantity}</small>
                        <span>{money((item.total_cents || item.unit_price_cents * item.quantity) / 100)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="track-footer-row">
                {activeOrder.address && (
                  <div className="track-address-box">
                    <span>Delivery destination:</span>
                    <b>{activeOrder.address}</b>
                  </div>
                )}
                <div className="track-total-box">
                  <span>Order total:</span>
                  <strong>{money((activeOrder.total || 0) / 100)}</strong>
                </div>
              </div>

              {activeOrder.statusHistory?.length > 0 && (
                <div className="track-history-log">
                  <h4>Status Timeline Log</h4>
                  <ol className="order-status-history">
                    {activeOrder.statusHistory.map((event) => (
                      <li key={`${event.status}-${event.created_at}`}>
                        <b>{event.status.replaceAll("_", " ")}</b>
                        <time dateTime={event.created_at}>
                          {new Date(event.created_at).toLocaleString()}
                        </time>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </details>
        </section>
      )}
    </main>
  );
}

function ContactPage() {
  const [feedback, setFeedback] = useState({ text: "", isError: false });
  const [busy, setBusy] = useState(false);

  async function send(event) {
    event.preventDefault();
    setFeedback({ text: "", isError: false });
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    if (!data.name.trim() || !EMAIL.test(data.email) || !data.msg.trim()) {
      setFeedback({ text: "Please enter your name, a valid email, and your message.", isError: true });
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim(),
          message: data.msg.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not deliver your inquiry.");
      setFeedback({ text: result.message || "Thank you. Your inquiry has been dispatched to our concierge care.", isError: false });
      form.reset();
    } catch (err) {
      setFeedback({ text: err.message || "Message delivery failed. Please reach us at care@ehsaanali.com", isError: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={`${pageClass} wrap page`}>
      <span className="cap dk">Concierge</span><h1 className="ph">Client care & inquiry</h1>
      <div className="story">
        <section>
          <details><summary>How long does delivery take?</summary><p>Standard delivery across Pakistan takes 2–4 business days. Express courier delivery is available in major cities.</p></details>
          <details><summary>What payment methods are supported?</summary><p>We accept Cash on Delivery (COD), Direct Bank Transfer (IBFT), JazzCash, EasyPaisa, and major credit/debit cards.</p></details>
          <details><summary>Can I return or exchange a fragrance?</summary><p>Unopened bottles with their original box seal intact may be exchanged within 7 days. Please review our <Link className="ul" href="/policies#returns">returns policy</Link>.</p></details>
        </section>
        <form className="cf checkout-form" onSubmit={send}>
          <label>Full name<input name="name" autoComplete="name" placeholder="Your name" required /></label>
          <label>Email address<input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label>
          <label>Message<textarea name="msg" rows="5" placeholder="How may our concierge assist your fragrance selection?" required /></label>
          {feedback.text && (
            <p className={feedback.isError ? "status-message" : "notice"} style={{ margin: "10px 0" }} role="status">
              {feedback.text}
            </p>
          )}
          <button className="btn cap" disabled={busy}>{busy ? "Transmitting…" : "Send message"}</button>
        </form>
      </div>
    </main>
  );
}

function StoryPage() {
  const { products } = useStore();
  const [customerReviews, setCustomerReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsLoadError, setReviewsLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setReviewsLoading(true);
    setReviewsLoadError(false);
    Promise.all(products.map(async (product) => {
      const response = await fetch(`/api/reviews?productId=${encodeURIComponent(product.id)}`, { signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Customer reviews are temporarily unavailable.");
      return (result.reviews || []).map((review) => ({ ...review, productName: product.short }));
    }))
      .then((reviewsByProduct) => {
        const reviews = reviewsByProduct.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setCustomerReviews(reviews.slice(0, 3));
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setCustomerReviews([]);
          setReviewsLoadError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setReviewsLoading(false);
      });
    return () => controller.abort();
  }, [products]);

  return (
    <main className={`${pageClass} page client-story`}>
      <section className="story-intro">
        <span className="cap dk">The Ihsaan point of view</span>
        <h1 className="ph">A fragrance should feel like yours.</h1>
        <p className="lead">We created Velvet Smoke as a signature with room for individuality: one scent, expressed in three concentrations. The right choice is the one that feels at home on you.</p>
        <Link className="btn cap" href="/shop">Discover Velvet Smoke <span>→</span></Link>
      </section>

      <section className="client-experience" id="client-experience">
        <div className="client-experience-heading">
          <span className="cap gold">Made personal</span>
          <h2>Your experience, at every step.</h2>
          <p>Explore at your pace. Get the details you need. Come back and tell us what you think.</p>
        </div>
        <div className="client-care-grid">
          <article className="client-care-card">
            <span className="client-care-number">01</span>
            <h3>Find your expression</h3>
            <p>Compare Eau de Parfum, Eau de Toilette and Extrait de Parfum to find the concentration that suits your style.</p>
            <Link href="/shop">Explore the collection <span aria-hidden="true">→</span></Link>
          </article>
          <article className="client-care-card">
            <span className="client-care-number">02</span>
            <h3>Stay in the know</h3>
            <p>Sign in to your account to look up an order and follow its status as it is packed, shipped and delivered.</p>
            <Link href="/track">Track an order <span aria-hidden="true">→</span></Link>
          </article>
          <article className="client-care-card">
            <span className="client-care-number">03</span>
            <h3>Your words matter</h3>
            <p>After trying a fragrance, share an honest review. Published reviews are shown here—never invented or pre-written.</p>
            <Link href={products[0] ? `/product?id=${products[0].id}#reviews` : "/shop"}>Read and write reviews <span aria-hidden="true">→</span></Link>
          </article>
        </div>
      </section>

      <section className="client-voices" aria-labelledby="client-voices-title">
        <div className="client-voices-heading">
          <div>
            <span className="cap dk">In their own words</span>
            <h2 id="client-voices-title">Notes from our clients.</h2>
          </div>
          <p>Reviews are shared by customers and published after moderation.</p>
        </div>
        {reviewsLoading ? <p className="empty" role="status">Loading customer reviews…</p> : reviewsLoadError ? (
          <p className="notice" role="alert">Customer reviews are temporarily unavailable. Please try again later.</p>
        ) : customerReviews.length ? (
          <div className="client-review-grid">
            {customerReviews.map((review) => (
              <article className="client-review-card" key={review.id}>
                <div className="client-review-meta">
                  <span className="stars" aria-label={`${review.stars} out of 5 stars`}>{"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}</span>
                  {review.verifiedPurchase && <span className="review-verified">Verified purchase</span>}
                </div>
                <blockquote>{review.text}</blockquote>
                <div className="client-review-byline"><b>{review.name}</b><span>{review.productName}</span></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="client-review-empty">
            <p>Our first customer notes will appear here as reviews are approved.</p>
            <Link className="ul" href="/shop">Explore the collection</Link>
          </div>
        )}
      </section>
    </main>
  );
}

function PoliciesPage() {
  return (
    <main className={`${pageClass} wrap page`}>
      <span className="cap dk">Maison Protocol</span>
      <h1 className="ph">Shipping, returns & authenticity</h1>
      <p className="lead">
        Maison Ihsaan Ali operates under strict artisanal standards. Each bottle is individually inspected and shipped in secure luxury presentation packaging.
      </p>
      <section id="shipping" className="post">
        <h3>Nationwide Courier Shipping (Pakistan)</h3>
        <p>
          We provide complimentary courier shipping on all orders across Pakistan via Trax, TCS, and Leopards Courier. Orders placed before 3:00 PM PKT are dispatched same-day. Delivery timeline is 2–3 business days for Karachi, Lahore, and Islamabad/Rawalpindi, and 3–4 business days for all other cities and regions. Cash on Delivery (COD) and Direct Bank Transfer (IBFT / JazzCash / EasyPaisa) are fully supported.
        </p>
      </section>
      <section id="returns" className="post">
        <h3>7-Day Exchange & Returns Policy</h3>
        <p>
          If your fragrance arrives damaged or defective, or if you wish to exchange an unopened bottle, contact our Client Concierge within 7 days of delivery. For hygiene and artisanal preservation, bottles with broken tamper-evident seals cannot be returned.
        </p>
      </section>
      <section id="privacy" className="post">
        <h3>French Concentrates & Quality Guarantee</h3>
        <p>
          All Maison Ihsaan Ali extraits and perfumes are formulated using pure French fragrance absolutes and aged denatured organic alcohol. We never dilute our batches or use synthetic fillers. Each batch has a guaranteed longevity of 12–14+ hours.
        </p>
      </section>
      <section id="terms" className="post">
        <h3>Data Protection & Client Privacy</h3>
        <p>
          Your personal details, contact number, and delivery address are strictly encrypted and used solely for courier fulfillment and order tracking notifications. We never share customer data with third parties.
        </p>
      </section>
    </main>
  );
}

function NotFoundPage() {
  return <main className={`${pageClass} wrap page`}><span className="cap dk">404</span><h1 className="ph">This page isn’t here.</h1><p className="lead">The link may be old or mistyped.</p><Link className="btn cap" href="/shop">Back to the shop</Link></main>;
}

export default function Storefront({ kind }) {
  const pages = {
    home: HomePage,
    shop: ShopPage,
    product: ProductPage,
    cart: CartPage,
    checkout: CheckoutPage,
    wishlist: WishlistPage,
    order: OrderPage,
    track: TrackPage,
    contact: ContactPage,
    story: StoryPage,
    policies: PoliciesPage,
    notFound: NotFoundPage,
  };
  const Page = pages[kind] || NotFoundPage;
  return <Page />;
}
