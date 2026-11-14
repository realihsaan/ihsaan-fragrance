"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CURRENCY, DEFAULT_CONTENT, money } from "./catalog";
import { useStore } from "./store-context";

function formatAdminMoney(cents) {
  return money(Number(cents || 0) / 100);
}

const NEXT_ORDER_STATUS = { pending: "packed", paid: "packed", packed: "shipped", shipped: "delivered" };

const ORDER_STATUS_CONFIG = {
  pending: { label: "Pending", icon: "⏳", badgeClass: "status-pending", title: "Awaiting fulfillment", description: "Orders received, awaiting packing" },
  paid: { label: "Paid", icon: "💳", badgeClass: "status-paid", title: "Payment confirmed", description: "Payment verified, ready to pack" },
  packed: { label: "Packed", icon: "📦", badgeClass: "status-packed", title: "Packed & ready", description: "Bottles boxed and ready for courier pickup" },
  shipped: { label: "Shipped", icon: "🚚", badgeClass: "status-shipped", title: "Dispatched", description: "On the way with courier to customer" },
  delivered: { label: "Delivered", icon: "✅", badgeClass: "status-delivered", title: "Delivered", description: "Completed & received by customer" },
  refunded: { label: "Refunded", icon: "↩", badgeClass: "status-refunded", title: "Refunded / Cancelled", description: "Order returned, refunded, or voided" },
  inventory_issue: { label: "Stock issue", icon: "⚠️", badgeClass: "status-inventory_issue", title: "Inventory Issue", description: "Requires stock investigation" },
};

const ORDER_STATUS_TABS = [
  { id: "all", label: "All orders", icon: "▤" },
  { id: "pending", label: "Pending", icon: "⏳" },
  { id: "packed", label: "Packed", icon: "📦" },
  { id: "shipped", label: "Shipped", icon: "🚚" },
  { id: "delivered", label: "Delivered", icon: "✅" },
  { id: "cod_remittance", label: "💰 COD Remittances", icon: "💵" },
  { id: "paid", label: "Paid", icon: "💳" },
  { id: "refunded", label: "Refunded", icon: "↩" },
];

const SECTIONS = [
  { content_key: "hero_image", label: "Homepage hero media", hasImage: true, hasVideo: true },
  { content_key: "hero_copy", label: "Homepage hero text", hasCopy: true },
  { content_key: "collection_copy", label: "Product collection intro", hasCopy: true },
  { content_key: "lifestyle_image", label: "Lifestyle section media", hasImage: true, hasVideo: true },
  { content_key: "lifestyle_copy", label: "Lifestyle section text", hasCopy: true },
  { content_key: "hero_leaves", label: "Hero background leaves", hasImage: true },
  { content_key: "note_top", label: "Top notes", hasImage: true },
  { content_key: "note_heart", label: "Heart notes", hasImage: true },
  { content_key: "note_base", label: "Base notes", hasImage: true },
];

const EMPTY_PRODUCTS = [
  { id: "edp", type: "fragrance", name: "", short: "", price: 0, stock: 0, size: "", tag: "", img: "", desc: "", pos: "50% 50%" },
  { id: "edt", type: "fragrance", name: "", short: "", price: 0, stock: 0, size: "", tag: "", img: "", desc: "", pos: "50% 50%" },
  { id: "ext", type: "fragrance", name: "", short: "", price: 0, stock: 0, size: "", tag: "", img: "", desc: "", pos: "50% 50%" },
];

const EMPTY_NEW_PRODUCT = {
  type: "fragrance",
  name: "",
  short: "",
  price: "",
  stock: "",
  size: "",
  tag: "",
  img: "",
  desc: "",
  pos: "50% 50%",
};

function initialSections() {
  return SECTIONS.map((section) => {
    const defaults = DEFAULT_CONTENT[section.content_key] || {};
    return {
      ...section,
      image_url: defaults.image || "",
      video_url: defaults.video || "",
      alt_text: defaults.alt || "",
      eyebrow_text: defaults.eyebrow || "",
      heading_text: defaults.heading || "",
      body_text: defaults.body || "",
      button_text: defaults.button_text || "",
      button_href: defaults.button_href || "",
    };
  });
}

function getWhatsAppLink(phone, publicId, customerName) {
  let clean = String(phone || "").replace(/[^0-9]/g, "");
  if (clean.startsWith("03") && clean.length === 11) clean = "92" + clean.slice(1);
  else if (clean.startsWith("3") && clean.length === 10) clean = "92" + clean;
  const msg = `Assalam-o-Alaikum ${customerName || "Customer"}, this is Maison Ihsaan Ali regarding your order #${publicId}.`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
}

function AdminOrderCard({
  order,
  busy,
  onUpdateStatus,
  onToggleWhatsApp,
  onUpdatePaymentStatus,
  onSaveCourier,
  onSubmitRemittance,
}) {
  const [isEditingCourier, setIsEditingCourier] = useState(false);
  const [courierNameInput, setCourierNameInput] = useState(order.courier_name || "Trax");
  const [courierCnInput, setCourierCnInput] = useState(order.courier_cn || "");

  const [showRemitForm, setShowRemitForm] = useState(false);
  const [remitCourier, setRemitCourier] = useState(order.courier_name || "Trax");
  const [remitCn, setRemitCn] = useState(order.courier_cn || "");
  const [remitRef, setRemitRef] = useState(order.remittance_reference || "");
  const [remitAmount, setRemitAmount] = useState(String((order.remittance_amount_cents || order.total_cents) / 100));
  const [remitProof, setRemitProof] = useState(order.remittance_proof || "");
  const [showProofModal, setShowProofModal] = useState(false);
  const [copiedCourierLink, setCopiedCourierLink] = useState(false);

  const statusCfg = ORDER_STATUS_CONFIG[order.status] || {
    label: order.status,
    icon: "•",
    badgeClass: `status-${order.status}`,
    title: order.status,
  };

  const nextStatus = NEXT_ORDER_STATUS[order.status];
  const nextActionLabel =
    order.status === "pending" ? "Confirm & mark packed →" :
    order.status === "paid" ? "Mark packed →" :
    order.status === "packed" ? "Mark shipped →" :
    order.status === "shipped" ? "Mark delivered →" : null;

  const trackingUrl = `/track?order=${encodeURIComponent(order.public_id)}&email=${encodeURIComponent(order.email || "")}`;
  const courierPortalUrl = `/courier?order=${encodeURIComponent(order.public_id)}`;
  const isWhatsAppAvailable = Boolean(order.has_whatsapp !== 0 && order.has_whatsapp !== false);
  const activeWhatsAppNumber = order.whatsapp_number || order.phone;

  const isPaid = order.payment_status === "paid";
  const isUnderReview = order.payment_status === "submitted";
  const isPendingPayment = !isPaid && !isUnderReview;

  function handleProofFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setRemitProof(event.target.result);
    reader.readAsDataURL(file);
  }

  function handleCopyCourierLink() {
    if (typeof window !== "undefined") {
      const fullUrl = `${window.location.origin}${courierPortalUrl}`;
      navigator.clipboard?.writeText(fullUrl);
      setCopiedCourierLink(true);
      setTimeout(() => setCopiedCourierLink(false), 2500);
    }
  }

  return (
    <article className={`admin-card admin-order-card status-border-${order.status}`} key={order.id}>
      {/* Proof Lightbox Modal */}
      {showProofModal && (order.remittance_proof || remitProof) && (
        <div className="admin-proof-modal-overlay" onClick={() => setShowProofModal(false)}>
          <div className="admin-proof-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="admin-proof-modal-header">
              <h4>Payment Slip Proof — Order #{order.public_id}</h4>
              <button type="button" className="admin-proof-modal-close" onClick={() => setShowProofModal(false)}>✕</button>
            </div>
            <div className="admin-proof-modal-body">
              <img src={order.remittance_proof || remitProof} alt="Payment slip" />
            </div>
            <div className="admin-proof-modal-footer">
              <span>Ref: {order.remittance_reference || "N/A"}</span>
              <a href={order.remittance_proof || remitProof} download={`slip-${order.public_id}.jpg`} target="_blank" rel="noreferrer">
                Open in new tab ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Top Heading */}
      <div className="admin-order-heading">
        <div>
          <span className="admin-eyebrow">ORDER</span>
          <h3>{order.public_id}</h3>
          <time dateTime={order.created_at}>{new Date(order.created_at).toLocaleString()}</time>
        </div>

        {/* Dual Badges: Delivery & Payment Status */}
        <div className="admin-order-heading-actions">
          <span className={`admin-order-status ${statusCfg.badgeClass}`}>
            <span aria-hidden="true">{statusCfg.icon}</span> Delivery: {statusCfg.label}
          </span>

          <span className={`admin-order-status ${
            isPaid ? "pay-status-paid" :
            isUnderReview ? "pay-status-submitted" : "pay-status-pending"
          }`}>
            {isPaid ? "✅ Payment: Paid & Verified" :
             isUnderReview ? "🔍 Payment: Proof Under Review" :
             order.payment_method === "cash_on_delivery" ? "⏳ Payment: Pending COD Cash" : "⏳ Payment: Pending"}
          </span>

          <a
            className="admin-order-track-link"
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open customer order tracking page"
          >
            Track ↗
          </a>
        </div>
      </div>

      {/* Customer & Address Details */}
      <div className="admin-order-details">
        <div>
          <span>Customer</span>
          <b>{order.customer_name || "Guest"}</b>
          <a href={`mailto:${order.email}`}>{order.email}</a>
          {order.phone && (
            <div className="admin-phone-column">
              <div className="admin-phone-item">
                <span className="admin-phone-type">📞 Call:</span>
                <a href={`tel:${order.phone}`}>{order.phone}</a>
              </div>

              {isWhatsAppAvailable ? (
                <div className="admin-whatsapp-row">
                  <a
                    className="admin-whatsapp-btn"
                    href={getWhatsAppLink(activeWhatsAppNumber, order.public_id, order.customer_name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open WhatsApp chat with prefilled order details"
                  >
                    💬 WhatsApp: {activeWhatsAppNumber}
                  </a>
                  <button
                    type="button"
                    className="admin-toggle-wa-btn is-remove"
                    disabled={Boolean(busy)}
                    onClick={() => onToggleWhatsApp(order, false)}
                    title="Mark this number as NOT registered on WhatsApp"
                  >
                    Mark: No WhatsApp ✕
                  </button>
                </div>
              ) : (
                <div className="admin-no-whatsapp-row">
                  <span className="admin-no-whatsapp-badge">
                    ❌ Not on WhatsApp (Call only)
                  </span>
                  <button
                    type="button"
                    className="admin-toggle-wa-btn is-has"
                    disabled={Boolean(busy)}
                    onClick={() => onToggleWhatsApp(order, true)}
                    title="Mark this number as having WhatsApp"
                  >
                    Mark: Has WhatsApp ✓
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <span>Delivery address</span>
          <b>{[order.address_line1, order.address_line2, order.city, order.region, order.postal_code, order.country].filter(Boolean).join(", ") || "Not provided"}</b>
        </div>

        <div>
          <span>Payment method</span>
          <b className="admin-payment-badge">
            {order.payment_method === "stripe" ? "💳 Card (Stripe)" :
             order.payment_method === "jazzcash" ? "📱 JazzCash" :
             order.payment_method === "easypaisa" ? "📱 EasyPaisa" :
             order.payment_method === "bank_transfer" ? "🏦 Bank Transfer (IBFT)" :
             "💵 Cash on delivery"}
          </b>
          {order.payment_reference && (
            <span className="admin-payment-ref">
              <strong>Ref:</strong> {order.payment_reference}
            </span>
          )}
          <span className="admin-currency-tag">{(order.currency || CURRENCY.code || "PKR").toUpperCase()}</span>
        </div>
      </div>

      {/* Courier Consignment Tracking Strip */}
      <div className="admin-courier-strip">
        <div className="admin-courier-strip-left">
          <span className="admin-courier-icon">🚚</span>
          {order.courier_name || order.courier_cn ? (
            <div className="admin-courier-info">
              <strong>Courier: {order.courier_name || "Express Courier"}</strong>
              {order.courier_cn ? (
                <span>CN#: <code>{order.courier_cn}</code></span>
              ) : (
                <small className="admin-courier-no-cn">No CN# entered</small>
              )}
            </div>
          ) : (
            <span className="admin-courier-unset">No courier assigned yet</span>
          )}
        </div>

        <div className="admin-courier-strip-right">
          <button
            type="button"
            className="admin-courier-edit-btn"
            onClick={() => setIsEditingCourier(!isEditingCourier)}
          >
            {isEditingCourier ? "Cancel ✕" : (order.courier_cn ? "Edit CN# ✎" : "＋ Assign Courier")}
          </button>

          <button
            type="button"
            className="admin-courier-copy-link-btn"
            onClick={handleCopyCourierLink}
            title="Copy link to send to Courier rider to upload payment slip"
          >
            {copiedCourierLink ? "✓ Link Copied!" : "🔗 Courier Slip Link"}
          </button>
        </div>
      </div>

      {/* Expandable Courier Editor Form */}
      {isEditingCourier && (
        <form
          className="admin-courier-inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSaveCourier(order, courierNameInput, courierCnInput);
            setIsEditingCourier(false);
          }}
        >
          <div className="admin-courier-input-group">
            <label>Courier:</label>
            <select
              value={courierNameInput}
              onChange={(e) => setCourierNameInput(e.target.value)}
            >
              <option value="Trax">Trax Express</option>
              <option value="TCS">TCS</option>
              <option value="PostEx">PostEx</option>
              <option value="Leopards">Leopards</option>
              <option value="Call Courier">Call Courier</option>
              <option value="M&P">M&P</option>
              <option value="Rider / Self">Company Rider</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="admin-courier-input-group">
            <label>CN# / Tracking ID:</label>
            <input
              type="text"
              placeholder="e.g. TRX-9821448"
              value={courierCnInput}
              onChange={(e) => setCourierCnInput(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="admin-primary-button admin-courier-save-btn"
            disabled={Boolean(busy)}
          >
            Save Courier Info ✓
          </button>
        </form>
      )}

      {/* Payment Proof & Remittance Settlement Card */}
      <div className={`admin-remittance-card pay-box-${order.payment_status}`}>
        {isUnderReview ? (
          <div className="admin-remittance-submitted-box">
            <div className="admin-remittance-box-header">
              <span className="admin-remittance-alert-icon">🔍</span>
              <div>
                <h4>COURIER PAYMENT SLIP SUBMITTED — AWAITING VERIFICATION</h4>
                <p>Courier/Rider has submitted payment details. Cross-check with your JazzCash or Bank statement.</p>
              </div>
            </div>

            <div className="admin-remittance-details-grid">
              <div>
                <span>Courier</span>
                <b>{order.courier_name || "Courier"}</b>
              </div>
              <div>
                <span>Consignment CN#</span>
                <b>{order.courier_cn || "N/A"}</b>
              </div>
              <div>
                <span>Remittance Reference / TID</span>
                <b className="admin-remit-tid"><code>{order.remittance_reference || "Slip Attached"}</code></b>
              </div>
              <div>
                <span>Amount Remitted</span>
                <b>Rs. {((order.remittance_amount_cents || order.total_cents) / 100).toLocaleString()}</b>
              </div>
            </div>

            {order.remittance_proof && (
              <div className="admin-remittance-proof-row">
                <button
                  type="button"
                  className="admin-remittance-proof-thumb-wrap"
                  onClick={() => setShowProofModal(true)}
                  title="Click to view full screenshot"
                >
                  <img src={order.remittance_proof} alt="Payment slip preview" />
                  <span className="admin-proof-overlay">🔍 View Full Slip</span>
                </button>
              </div>
            )}

            <div className="admin-remittance-review-actions">
              <button
                type="button"
                className="admin-verify-paid-btn"
                disabled={Boolean(busy)}
                onClick={() => onUpdatePaymentStatus(order, "paid")}
              >
                ✅ Verify & Approve Payment (Mark Paid)
              </button>
              <button
                type="button"
                className="admin-reject-proof-btn"
                disabled={Boolean(busy)}
                onClick={() => onUpdatePaymentStatus(order, "pending")}
              >
                ✕ Reject / Request Correction
              </button>
            </div>
          </div>
        ) : isPaid ? (
          <div className="admin-remittance-paid-box">
            <div className="admin-paid-header-row">
              <div className="admin-paid-left">
                <span className="admin-paid-check-badge">✓</span>
                <div>
                  <strong>PAYMENT COMPLETED & VERIFIED</strong>
                  <small>
                    Verified by {order.payment_verified_by || "Admin"}
                    {order.payment_verified_at && ` on ${new Date(order.payment_verified_at).toLocaleDateString()}`}
                  </small>
                </div>
              </div>

              {order.remittance_proof && (
                <button
                  type="button"
                  className="admin-view-slip-link-btn"
                  onClick={() => setShowProofModal(true)}
                >
                  📸 View Verified Slip
                </button>
              )}
            </div>

            {order.remittance_reference && (
              <div className="admin-paid-ref-note">
                <span>Remittance Ref:</span> <code>{order.remittance_reference}</code>
                {order.courier_name && <span> via {order.courier_name}</span>}
              </div>
            )}
          </div>
        ) : (
          <div className="admin-remittance-pending-box">
            <div className="admin-pending-pay-row">
              <div className="admin-pending-pay-info">
                <span className="admin-pending-pay-icon">⏳</span>
                <div>
                  <strong>
                    {order.payment_method === "cash_on_delivery"
                      ? "Awaiting Courier Cash Collection & Remittance"
                      : "Awaiting Customer Payment"}
                  </strong>
                  <p>
                    {order.payment_method === "cash_on_delivery"
                      ? `Rider collects Rs. ${(order.total_cents / 100).toLocaleString()} upon delivery. Once remitted to JazzCash/Bank, record the slip below.`
                      : "Pending transaction reference verification."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="admin-record-remittance-btn"
                onClick={() => setShowRemitForm(!showRemitForm)}
              >
                {showRemitForm ? "Hide Form ✕" : "＋ Record Courier Remittance Slip"}
              </button>
            </div>

            {/* Quick Record Remittance Form */}
            {showRemitForm && (
              <form
                className="admin-record-remittance-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  onSubmitRemittance(order, {
                    courierName: remitCourier,
                    courierCn: remitCn,
                    remittanceRef: remitRef,
                    remittanceAmountCents: Math.round(Number(remitAmount) * 100),
                    remittanceProof: remitProof,
                    markAsPaid: false,
                  });
                  setShowRemitForm(false);
                }}
              >
                <h5>Record Courier Payment / Remittance Proof</h5>
                <div className="admin-record-remit-grid">
                  <div>
                    <label>Courier:</label>
                    <select
                      value={remitCourier}
                      onChange={(e) => setRemitCourier(e.target.value)}
                    >
                      <option value="Trax">Trax</option>
                      <option value="TCS">TCS</option>
                      <option value="PostEx">PostEx</option>
                      <option value="Leopards">Leopards</option>
                      <option value="Call Courier">Call Courier</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label>Courier CN#:</label>
                    <input
                      type="text"
                      placeholder="e.g. TRX-9821448"
                      value={remitCn}
                      onChange={(e) => setRemitCn(e.target.value)}
                    />
                  </div>

                  <div>
                    <label>Transaction / TID Ref *:</label>
                    <input
                      type="text"
                      placeholder="e.g. JazzCash TID #981248"
                      value={remitRef}
                      onChange={(e) => setRemitRef(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label>Amount (PKR):</label>
                    <input
                      type="number"
                      value={remitAmount}
                      onChange={(e) => setRemitAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="admin-remit-proof-upload">
                  <label>
                    <strong>📸 Attach Slip Screenshot:</strong>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProofFileChange}
                    />
                  </label>
                  {remitProof && (
                    <div className="admin-remit-proof-preview">
                      <img src={remitProof} alt="Slip preview" />
                      <button type="button" onClick={() => setRemitProof("")}>Remove ✕</button>
                    </div>
                  )}
                </div>

                <div className="admin-record-remit-actions">
                  <button
                    type="submit"
                    className="admin-secondary-button"
                    disabled={Boolean(busy)}
                  >
                    Submit for Review (Mark Under Review)
                  </button>
                  <button
                    type="button"
                    className="admin-primary-button"
                    disabled={Boolean(busy)}
                    onClick={() => {
                      onSubmitRemittance(order, {
                        courierName: remitCourier,
                        courierCn: remitCn,
                        remittanceRef: remitRef || "Cash received",
                        remittanceAmountCents: Math.round(Number(remitAmount) * 100),
                        remittanceProof: remitProof,
                        markAsPaid: true,
                      });
                      setShowRemitForm(false);
                    }}
                  >
                    Directly Verify & Confirm Paid ✓
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Package Items */}
      <div className="admin-order-items">
        {order.items.map((item) => (
          <div key={`${order.id}-${item.product_id}`}>
            <span>{item.product_name} × {item.quantity}</span>
            <b>{formatAdminMoney(item.total_cents)}</b>
          </div>
        ))}
      </div>

      <div className="admin-order-total">
        <span>Order total</span>
        <b>{formatAdminMoney(order.total_cents)}</b>
      </div>

      {order.status_history?.length > 0 && (
        <details className="admin-order-history-collapsible">
          <summary>
            <b>Status history ({order.status_history.length})</b>
            <small>Latest: {order.status_history[order.status_history.length - 1]?.status.replaceAll("_", " ")}</small>
          </summary>
          <div className="admin-order-history">
            {order.status_history.map((event, idx) => (
              <span key={`${event.status}-${event.created_at}-${idx}`}>
                <i className={`admin-order-history-dot status-${event.status}`} />
                <span>
                  <strong>{event.status.replaceAll("_", " ")}</strong> · {new Date(event.created_at).toLocaleString()}
                  {event.changed_by ? ` · by ${event.changed_by}` : ""}
                </span>
              </span>
            ))}
          </div>
        </details>
      )}

      {/* Toolbar: Advance Fulfillment & Status Switchers */}
      <div className="admin-order-actions-toolbar">
        {nextActionLabel && (
          <button
            className="admin-primary-button admin-order-advance"
            type="button"
            disabled={Boolean(busy)}
            onClick={() => onUpdateStatus(order, nextStatus)}
          >
            {busy === `order:${order.id}` ? "Updating…" : nextActionLabel}
          </button>
        )}

        <div className="admin-order-status-selector">
          <label htmlFor={`order-status-select-${order.id}`}>Delivery:</label>
          <select
            id={`order-status-select-${order.id}`}
            value={order.status}
            disabled={Boolean(busy)}
            onChange={(e) => onUpdateStatus(order, e.target.value)}
          >
            <option value="pending">⏳ Pending</option>
            <option value="packed">📦 Packed</option>
            <option value="shipped">🚚 Shipped</option>
            <option value="delivered">✅ Delivered</option>
            <option value="paid">💳 Paid</option>
            <option value="refunded">↩ Refunded</option>
            <option value="inventory_issue">⚠️ Stock issue</option>
          </select>
        </div>

        <div className="admin-order-status-selector">
          <label htmlFor={`order-payment-select-${order.id}`}>Payment:</label>
          <select
            id={`order-payment-select-${order.id}`}
            value={order.payment_status || "pending"}
            disabled={Boolean(busy)}
            onChange={(e) => onUpdatePaymentStatus(order, e.target.value)}
          >
            <option value="pending">⏳ Pending Payment</option>
            <option value="submitted">🔍 Proof Under Review</option>
            <option value="paid">✅ Paid & Verified</option>
            <option value="refunded">↩ Refunded</option>
          </select>
        </div>
      </div>
    </article>
  );
}

export default function AdminPanel() {
  const { user, setUser, authConfigured, authLoading, refreshStorefront } = useStore();
  const [activeView, setActiveView] = useState("overview");
  const [products, setProducts] = useState(EMPTY_PRODUCTS);
  const [newProduct, setNewProduct] = useState(EMPTY_NEW_PRODUCT);
  const [sections, setSections] = useState(initialSections);
  const [mediaImages, setMediaImages] = useState([]);
  const [mediaTarget, setMediaTarget] = useState("section:hero_image");
  const [pendingReviews, setPendingReviews] = useState([]);
  const [approvedReviews, setApprovedReviews] = useState([]);
  const [reviewSubTab, setReviewSubTab] = useState("pending");
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [newReviewForm, setNewReviewForm] = useState({
    productId: "edp",
    customerName: "",
    rating: 5,
    reviewText: "",
    verifiedPurchase: true,
    status: "approved",
  });
  const [orders, setOrders] = useState([]);
  const [orderCount, setOrderCount] = useState(0);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [deliveredOrderCount, setDeliveredOrderCount] = useState(0);
  const [revenueOrders, setRevenueOrders] = useState(0);
  const [revenueCents, setRevenueCents] = useState(0);
  const [deliveredRevenueCents, setDeliveredRevenueCents] = useState(0);
  const [productSales, setProductSales] = useState([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderPaymentFilter, setOrderPaymentFilter] = useState("all");
  const [orderGroupByStatus, setOrderGroupByStatus] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const adminRequest = useCallback(async (url, options = {}) => {
    const response = await fetch(url, options);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Admin request failed.");
    return result;
  }, []);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [result, imageResult] = await Promise.all([
        adminRequest("/api/admin"),
        adminRequest("/api/admin/images"),
      ]);
      setProducts(result.products.length ? result.products : EMPTY_PRODUCTS);
      setMediaImages(imageResult.images || []);
      const sectionMap = new Map((result.content || []).map((section) => [section.content_key, section]));
      setSections(SECTIONS.map((section) => {
        const defaults = DEFAULT_CONTENT[section.content_key] || {};
        const saved = sectionMap.get(section.content_key);
        return {
          ...section,
          image_url: saved?.image_url ?? defaults.image ?? "",
          video_url: saved?.video_url || defaults.video || "",
          alt_text: saved?.alt_text ?? defaults.alt ?? "",
          eyebrow_text: saved?.eyebrow_text || defaults.eyebrow || "",
          heading_text: saved?.heading_text || defaults.heading || "",
          body_text: saved?.body_text || defaults.body || "",
          button_text: saved?.button_text || defaults.button_text || "",
          button_href: saved?.button_href || defaults.button_href || "",
        };
      }));
      setPendingReviews(result.pendingReviews || []);
      setApprovedReviews(result.approvedReviews || []);
      setOrders(result.orders || []);
      setOrderCount(result.orderCount || 0);
      setPendingOrderCount(result.pendingOrderCount || 0);
      setDeliveredOrderCount(result.deliveredOrderCount || 0);
      setRevenueOrders(result.revenueOrders || 0);
      setRevenueCents(result.revenueCents || 0);
      setDeliveredRevenueCents(result.deliveredRevenueCents || 0);
      setProductSales(result.productSales || []);
      setAuthorized(true);
    } catch (loadError) {
      setAuthorized(false);
      setError(loadError.message || "Admin data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [adminRequest]);

  useEffect(() => {
    if (!user || !authConfigured) {
      setAuthorized(false);
      return;
    }
    loadAdminData();
  }, [user, authConfigured, loadAdminData]);

  async function signIn(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email").toString().trim().toLowerCase();
    const password = formData.get("password").toString();
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sign-in failed.");
      setUser(result.user);
      setMessage("Signed in. Checking admin access…");
    } catch (signInError) {
      setError(signInError.message || "Sign-in failed.");
    }
  }

  async function signOut() {
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not sign out.");
    } catch (signOutError) {
      setError(signOutError.message || "Could not sign out.");
      return;
    }
    setUser(null);
    setAuthorized(false);
    setMessage("");
  }

  function updateProduct(id, field, value) {
    setProducts((current) => current.map((product) => product.id === id ? { ...product, [field]: value } : product));
  }

  function updateNewProduct(field, value) {
    setNewProduct((current) => ({ ...current, [field]: value }));
  }

  async function uploadNewProductImage(file) {
    if (!file) return;
    setBusy("upload:new-product");
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("key", "product-new");
      formData.set("file", file);
      const result = await adminRequest("/api/admin/images", { method: "POST", body: formData });
      updateNewProduct("img", result.url);
      setMessage("Image uploaded. Add the product to save it to your catalog.");
      try {
        await refreshMediaImages();
      } catch (refreshError) {
        console.error("Product image uploaded, but the library could not be refreshed:", refreshError);
        setError("Image uploaded, but the library could not be refreshed. Reload the page to see it.");
      }
    } catch (uploadError) {
      setError(uploadError.message || "Product image upload failed.");
    } finally {
      setBusy("");
    }
  }

  function updateSection(key, field, value) {
    setSections((current) => current.map((section) => section.content_key === key ? { ...section, [field]: value } : section));
  }

  async function uploadImage(key, file) {
    if (!file) return;
    setBusy(`upload:${key}`);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("key", key);
      formData.set("file", file);
      const result = await adminRequest("/api/admin/images", { method: "POST", body: formData });
      if (key.startsWith("product-")) {
        await saveProductImage(key.slice("product-".length), result.url);
      } else {
        updateSection(key, "image_url", result.url);
        setMessage("Image uploaded. Save the section to publish it.");
        try {
          await refreshMediaImages();
        } catch (refreshError) {
          console.error("Image uploaded, but the library could not be refreshed:", refreshError);
          setError("Image uploaded, but the library could not be refreshed. Reload the page to see it.");
        }
      }
    } catch (uploadError) {
      setError(uploadError.message || "Image upload failed.");
    } finally {
      setBusy("");
    }
  }

  async function refreshMediaImages() {
    const result = await adminRequest("/api/admin/images");
    setMediaImages(result.images || []);
  }

  async function saveProductImage(productId, img) {
    setBusy(`product-image:${productId}`);
    setError("");
    setMessage("");
    try {
      await adminRequest("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "product-image", productId, img }),
      });
      updateProduct(productId, "img", img);
      const product = products.find((entry) => entry.id === productId);
      setMessage(`${product?.name || "Product"} image saved.`);
      await refreshSavedViews();
    } catch (saveError) {
      setError(`Image uploaded, but the product image could not be saved. ${saveError.message || "Please try again."}`);
    } finally {
      setBusy("");
    }
  }

  async function uploadLibraryImage(file) {
    if (!file) return;
    setBusy("upload:library");
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("key", "library");
      formData.set("file", file);
      await adminRequest("/api/admin/images", { method: "POST", body: formData });
      setMessage("Image added to your library. Select where to use it below.");
      try {
        await refreshMediaImages();
      } catch (refreshError) {
        console.error("Image uploaded, but the library could not be refreshed:", refreshError);
        setError("Image uploaded, but the library could not be refreshed. Reload the page to see it.");
      }
    } catch (uploadError) {
      setError(uploadError.message || "Image upload failed.");
    } finally {
      setBusy("");
    }
  }

  async function assignLibraryImage(url) {
    const [targetType, targetId] = mediaTarget.split(":");
    if (targetType === "product") {
      await saveProductImage(targetId, url);
      return;
    }
    updateSection(targetId, "image_url", url);
    setMessage("Image selected. Save the section to publish the change.");
  }

  async function deleteLibraryImage(image) {
    if (image.usedBy.length) {
      setError("This image is in use. Replace and save its product or section before deleting it.");
      return;
    }
    if (!window.confirm("Delete this uploaded image permanently?")) return;
    setBusy(`delete:${image.name}`);
    setError("");
    setMessage("");
    try {
      await adminRequest(`/api/admin/images?file=${encodeURIComponent(image.name)}`, { method: "DELETE" });
      setMediaImages((current) => current.filter((entry) => entry.name !== image.name));
      setMessage("Image deleted.");
    } catch (deleteError) {
      setError(deleteError.message || "Image could not be deleted.");
      try {
        await refreshMediaImages();
      } catch (refreshError) {
        console.error("Could not refresh the image library after a failed delete:", refreshError);
      }
    } finally {
      setBusy("");
    }
  }

  async function saveProduct(product) {
    setBusy(`product:${product.id}`);
    setError("");
    setMessage("");
    try {
      await adminRequest("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "product", product }),
      });
      setMessage(`${product.name} saved.`);
      await refreshSavedViews();
    } catch (saveError) {
      setError(saveError.message || "Product could not be saved.");
    } finally {
      setBusy("");
    }
  }

  async function createProduct(event) {
    event.preventDefault();
    setBusy("product:create");
    setError("");
    setMessage("");
    try {
      const result = await adminRequest("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            ...newProduct,
            price: Number(newProduct.price),
            stock: Number(newProduct.stock),
          },
        }),
      });
      setProducts((current) => [result.product, ...current.filter((product) => product.id !== result.product.id)]);
      setNewProduct(EMPTY_NEW_PRODUCT);
      setMessage(`${result.product.name} added to your catalog.`);
      await refreshStorefront();
    } catch (createError) {
      setError(createError.message || "Product could not be added.");
    } finally {
      setBusy("");
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete “${product.name}”? Products with order or review history can’t be deleted.`)) return;
    setBusy(`product:delete:${product.id}`);
    setError("");
    setMessage("");
    try {
      await adminRequest(`/api/admin?id=${encodeURIComponent(product.id)}`, { method: "DELETE" });
      setProducts((current) => current.filter((entry) => entry.id !== product.id));
      setMessage(`${product.name} deleted.`);
      await refreshStorefront();
    } catch (deleteError) {
      setError(deleteError.message || "Product could not be deleted.");
    } finally {
      setBusy("");
    }
  }

  async function saveSection(section) {
    setBusy(`section:${section.content_key}`);
    setError("");
    setMessage("");
    try {
      await adminRequest("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "content", section }),
      });
      setMessage(`${section.label} saved.`);
      await refreshSavedViews();
    } catch (saveError) {
      setError(saveError.message || "Section image could not be saved.");
    } finally {
      setBusy("");
    }
  }

  async function refreshSavedViews() {
    try {
      await Promise.all([refreshStorefront(), refreshMediaImages()]);
    } catch (refreshError) {
      console.error("Admin changes were saved, but a view could not be refreshed:", refreshError);
      setError("Changes were saved, but the storefront or image library did not refresh. Reload the page to confirm.");
    }
  }

  async function moderateReview(review, status) {
    setBusy(`review:${review.id}`);
    setError("");
    setMessage("");
    try {
      await adminRequest("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "review", reviewId: review.id, status }),
      });
      setPendingReviews((current) => current.filter((item) => item.id !== review.id));
      if (status === "approved") {
        setApprovedReviews((current) => [{ ...review, status: "approved" }, ...current]);
      } else {
        setApprovedReviews((current) => current.filter((item) => item.id !== review.id));
      }
      setMessage(status === "approved" ? "Review approved and published live." : "Review rejected.");
    } catch (reviewError) {
      setError(reviewError.message || "Review moderation failed.");
    } finally {
      setBusy("");
    }
  }

  async function createReview(event) {
    event.preventDefault();
    setBusy("review:create");
    setError("");
    setMessage("");
    try {
      await adminRequest("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "create_review",
          ...newReviewForm,
        }),
      });
      setMessage("Real customer review created and published live.");
      setShowAddReviewModal(false);
      setNewReviewForm({
        productId: products[0]?.id || "edp",
        customerName: "",
        rating: 5,
        reviewText: "",
        verifiedPurchase: true,
        status: "approved",
      });
      await loadAdminData();
    } catch (createErr) {
      setError(createErr.message || "Failed to create review.");
    } finally {
      setBusy("");
    }
  }

  async function deleteReview(reviewId) {
    if (!window.confirm("Delete this review permanently?")) return;
    setBusy(`review:delete:${reviewId}`);
    setError("");
    setMessage("");
    try {
      await adminRequest("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "delete_review", reviewId }),
      });
      setApprovedReviews((current) => current.filter((r) => r.id !== reviewId));
      setPendingReviews((current) => current.filter((r) => r.id !== reviewId));
      setMessage("Review permanently deleted.");
    } catch (delErr) {
      setError(delErr.message || "Failed to delete review.");
    } finally {
      setBusy("");
    }
  }

  async function updateOrderStatus(order, nextStatus) {
    if (order.status === nextStatus) return;
    setBusy(`order:${order.id}`);
    setError("");
    setMessage("");
    try {
      await adminRequest("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "order", orderId: order.public_id, status: nextStatus }),
      });
      setOrders((current) => current.map((item) => item.id === order.id
        ? {
          ...item,
          status: nextStatus,
          status_history: [...item.status_history, {
            status: nextStatus,
            created_at: new Date().toISOString(),
            changed_by: user.user_metadata?.full_name || user.email,
          }],
        }
        : item));
      if (order.status === "pending" && nextStatus !== "pending") {
        setPendingOrderCount((count) => Math.max(0, count - 1));
      } else if (order.status !== "pending" && nextStatus === "pending") {
        setPendingOrderCount((count) => count + 1);
      }
      if (nextStatus === "delivered" && order.status !== "delivered") {
        setDeliveredOrderCount((count) => count + 1);
        setDeliveredRevenueCents((amount) => amount + order.total_cents);
        if (order.payment_method === "cash_on_delivery") {
          setRevenueCents((amount) => amount + order.total_cents);
          setRevenueOrders((count) => count + 1);
          setProductSales((current) => current.map((sale) => {
            const item = order.items.find((entry) => entry.product_id === sale.product_id);
            return item ? {
              ...sale,
              units_delivered: sale.units_delivered + item.quantity,
              revenue_cents: sale.revenue_cents + item.total_cents,
            } : sale;
          }));
        } else {
          setProductSales((current) => current.map((sale) => {
            const item = order.items.find((entry) => entry.product_id === sale.product_id);
            return item ? { ...sale, units_delivered: sale.units_delivered + item.quantity } : sale;
          }));
        }
      }
      setMessage(`Order ${order.public_id} marked ${nextStatus.replaceAll("_", " ")}.`);
    } catch (statusError) {
      setError(statusError.message || "Order status could not be updated.");
    } finally {
      setBusy("");
    }
  }

  function advanceOrder(order, status) {
    return updateOrderStatus(order, status);
  }

  async function toggleOrderWhatsApp(order, nextHasWhatsapp) {
    setBusy(`whatsapp:${order.id}`);
    setError("");
    setMessage("");
    try {
      await adminRequest("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "order-whatsapp",
          orderId: order.public_id,
          hasWhatsapp: nextHasWhatsapp,
          whatsappNumber: nextHasWhatsapp ? (order.whatsapp_number || order.phone) : null,
        }),
      });
      setOrders((current) => current.map((item) => item.id === order.id
        ? {
          ...item,
          has_whatsapp: nextHasWhatsapp ? 1 : 0,
          whatsapp_number: nextHasWhatsapp ? (item.whatsapp_number || item.phone) : null,
        }
        : item));
      setMessage(`Order ${order.public_id} WhatsApp status: ${nextHasWhatsapp ? "WhatsApp active" : "marked as not a WhatsApp number"}.`);
    } catch (waError) {
      setError(waError.message || "Could not update WhatsApp status.");
    } finally {
      setBusy("");
    }
  }

  async function saveOrderCourier(order, courierName, courierCn) {
    setBusy(`courier:${order.id}`);
    setError("");
    setMessage("");
    try {
      await adminRequest("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "order-courier",
          orderId: order.public_id,
          courierName,
          courierCn,
        }),
      });
      setOrders((current) => current.map((item) => item.id === order.id
        ? { ...item, courier_name: courierName, courier_cn: courierCn }
        : item));
      setMessage(`Courier details for #${order.public_id} updated (${courierName} · ${courierCn || "No CN"}).`);
    } catch (err) {
      setError(err.message || "Could not save courier details.");
    } finally {
      setBusy("");
    }
  }

  async function updateOrderPaymentStatus(order, paymentStatus) {
    setBusy(`paystatus:${order.id}`);
    setError("");
    setMessage("");
    try {
      const result = await adminRequest("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "order-payment-status",
          orderId: order.public_id,
          paymentStatus,
        }),
      });
      setOrders((current) => current.map((item) => item.id === order.id
        ? {
          ...item,
          payment_status: paymentStatus,
          payment_verified_at: result.paymentVerifiedAt || item.payment_verified_at,
          payment_verified_by: result.paymentVerifiedBy || item.payment_verified_by,
        }
        : item));
      setMessage(`Order #${order.public_id} payment status set to ${paymentStatus.toUpperCase()}.`);
    } catch (err) {
      setError(err.message || "Could not update payment status.");
    } finally {
      setBusy("");
    }
  }

  async function submitOrderRemittance(order, remittanceData) {
    setBusy(`remit:${order.id}`);
    setError("");
    setMessage("");
    try {
      const result = await adminRequest("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "order-remittance",
          orderId: order.public_id,
          courierName: remittanceData.courierName,
          courierCn: remittanceData.courierCn,
          remittanceRef: remittanceData.remittanceRef,
          remittanceProof: remittanceData.remittanceProof,
          remittanceAmountCents: remittanceData.remittanceAmountCents,
          markAsPaid: remittanceData.markAsPaid,
        }),
      });
      setOrders((current) => current.map((item) => item.id === order.id
        ? {
          ...item,
          payment_status: result.paymentStatus,
          courier_name: result.courierName || item.courier_name,
          courier_cn: result.courierCn || item.courier_cn,
          remittance_reference: result.remittanceRef,
          remittance_proof: result.remittanceProof || item.remittance_proof,
          remittance_amount_cents: result.remittanceAmountCents,
          payment_verified_by: result.paymentVerifiedBy || item.payment_verified_by,
          remitted_at: new Date().toISOString(),
        }
        : item));
      setMessage(`Remittance for Order #${order.public_id} saved (${result.paymentStatus === "paid" ? "Confirmed Paid" : "Under Review"}).`);
    } catch (err) {
      setError(err.message || "Could not save remittance.");
    } finally {
      setBusy("");
    }
  }

  const orderCountsByStatus = useMemo(() => {
    const counts = { all: orders.length, pending: 0, paid: 0, packed: 0, shipped: 0, delivered: 0, refunded: 0, inventory_issue: 0, cod_remittance: 0 };
    for (const order of orders) {
      if (counts[order.status] !== undefined) {
        counts[order.status] += 1;
      }
      if (order.payment_method === "cash_on_delivery") {
        counts.cod_remittance += 1;
      }
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = orderSearchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (orderStatusFilter === "cod_remittance") {
        if (order.payment_method !== "cash_on_delivery") return false;
      } else if (orderStatusFilter !== "all" && order.status !== orderStatusFilter) {
        return false;
      }
      if (orderPaymentFilter !== "all" && order.payment_method !== orderPaymentFilter) {
        return false;
      }
      if (query) {
        const matchesId = (order.public_id || "").toLowerCase().includes(query);
        const matchesName = (order.customer_name || "").toLowerCase().includes(query);
        const matchesEmail = (order.email || "").toLowerCase().includes(query);
        const matchesPhone = (order.phone || "").toLowerCase().includes(query);
        const matchesCity = (order.city || "").toLowerCase().includes(query);
        const matchesItem = (order.items || []).some((item) => (item.product_name || "").toLowerCase().includes(query));
        if (!matchesId && !matchesName && !matchesEmail && !matchesPhone && !matchesCity && !matchesItem) {
          return false;
        }
      }
      return true;
    });
  }, [orders, orderStatusFilter, orderPaymentFilter, orderSearchQuery]);

  const groupedOrders = useMemo(() => {
    const statusOrder = ["pending", "paid", "packed", "shipped", "delivered", "refunded", "inventory_issue"];
    const groups = [];
    for (const st of statusOrder) {
      const list = filteredOrders.filter((order) => order.status === st);
      if (list.length > 0) {
        const total = list.reduce((sum, o) => sum + (o.total_cents || 0), 0);
        groups.push({
          status: st,
          config: ORDER_STATUS_CONFIG[st] || { label: st, icon: "•", badgeClass: `status-${st}`, title: st, description: "" },
          orders: list,
          totalCents: total,
        });
      }
    }
    return groups;
  }, [filteredOrders]);

  const lowStockProducts = products.filter((product) => product.stock <= 5);
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
  const views = [
    { id: "overview", label: "Overview", icon: "⌂" },
    { id: "orders", label: "Orders", icon: "▤", count: pendingOrderCount },
    { id: "products", label: "Products & stock", icon: "▦" },
    { id: "media", label: "Storefront media", icon: "▧" },
    { id: "reviews", label: "Reviews", icon: "☆", count: pendingReviews.length },
  ];

  if (authLoading) {
    return (
      <main className="admin-login-page">
        <div className="admin-login-brand"><span className="admin-brand-mark">I</span><span>IHSAAN <b>STUDIO</b></span></div>
        <section className="admin-login-card">
          <span className="admin-eyebrow">STORE MANAGEMENT</span>
          <h1>Admin panel</h1>
          <p>Connecting to your local store database…</p>
        </section>
      </main>
    );
  }

  if (!authConfigured || !user || !authorized) {
    return (
      <main className="admin-login-page">
        <div className="admin-login-brand"><span className="admin-brand-mark">I</span><span>IHSAAN <b>STUDIO</b></span></div>
        <form className="admin-login-card" onSubmit={signIn}>
          <span className="admin-eyebrow">STORE MANAGEMENT</span>
          <h1>Welcome back</h1>
          <p>Sign in to manage your fragrance store.</p>
          <p>Use the admin email and password saved in <code>.env.local</code>. The values in <code>.env.example</code> are placeholders.</p>
          {error && <p className="admin-login-error" role="alert">{error}</p>}
          {!authConfigured ? (
            <p className="admin-login-error">MySQL is unavailable. Start MySQL and run <code>npm run db:setup</code>.</p>
          ) : !user ? (
            <>
              <label>Email<input name="email" type="email" autoComplete="username" required /></label>
              <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
              <button className="admin-primary-button" type="submit">Sign in to dashboard <span aria-hidden="true">→</span></button>
            </>
          ) : (
            <>
              <p className="admin-login-error" role={loading ? "status" : "alert"}>{loading ? "Verifying admin access…" : error || "This account does not have admin access."}</p>
              {!loading && <button className="admin-primary-button" type="button" onClick={signOut}>Sign out and use another account <span aria-hidden="true">→</span></button>}
            </>
          )}
          <a className="admin-back-link" href="/">← Back to storefront</a>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-label="Maison Ihsaan Ali storefront">
          <span className="admin-brand-mark">I</span>
          <span className="admin-brand-copy">IHSAAN <b>STUDIO</b><small>STORE MANAGEMENT</small></span>
        </a>
        <div className="admin-sidebar-label">WORKSPACE</div>
        <nav className="admin-nav" aria-label="Admin dashboard">
          {views.map((view) => (
            <button
              className={`admin-nav-link ${activeView === view.id ? "is-active" : ""}`}
              type="button"
              key={view.id}
              aria-current={activeView === view.id ? "page" : undefined}
              onClick={() => setActiveView(view.id)}
            >
              <span className="admin-nav-icon" aria-hidden="true">{view.icon}</span>
              <span>{view.label}</span>
              {view.count > 0 && <span className="admin-nav-count">{view.count}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-profile">
            <span className="admin-avatar">{user.user_metadata?.full_name?.slice(0, 1).toUpperCase() || "A"}</span>
            <span className="admin-profile-copy"><b>{user.user_metadata?.full_name || "Store admin"}</b><small>{user.email}</small></span>
          </div>
          <button className="admin-signout" type="button" onClick={signOut}>Sign out <span aria-hidden="true">↗</span></button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div><span className="admin-eyebrow">MAISON IHSAAN ALI / ADMIN</span><h1>{views.find((view) => view.id === activeView)?.label}</h1></div>
          <a className="admin-store-link" href="/" target="_blank" rel="noreferrer">View storefront <span aria-hidden="true">↗</span></a>
        </header>
        <div className="admin-content">
          {error && <p className="admin-alert" role="alert">{error}</p>}
          {message && <p className="admin-success" role="status">{message}</p>}

          {activeView === "overview" && (
            <section className="admin-overview" aria-labelledby="admin-overview-title">
              <div className="admin-welcome">
                <div><span className="admin-eyebrow">YOUR STORE AT A GLANCE</span><h2 id="admin-overview-title">Good to see you, {user.user_metadata?.full_name?.split(" ")[0] || "there"}.</h2><p>Here’s what’s happening with your store today.</p></div>
                <button className="admin-primary-button admin-quick-button" type="button" onClick={() => setActiveView("products")}>Manage products <span aria-hidden="true">→</span></button>
              </div>
              <div className="admin-stat-grid">
                <article className="admin-stat-card admin-stat-revenue"><span className="admin-stat-icon">$</span><span className="admin-stat-label">Recognized revenue</span><strong>{formatAdminMoney(revenueCents)}</strong><small>From {revenueOrders} paid or delivered orders</small></article>
                <article className={`admin-stat-card ${pendingOrderCount ? "is-highlight" : ""}`}><span className="admin-stat-icon">▤</span><span className="admin-stat-label">Orders received</span><strong>{orderCount}</strong><small>{pendingOrderCount ? `${pendingOrderCount} awaiting processing` : "All orders up to date"}</small></article>
                <article className="admin-stat-card"><span className="admin-stat-icon">✓</span><span className="admin-stat-label">Orders delivered</span><strong>{deliveredOrderCount}</strong><small>{formatAdminMoney(deliveredRevenueCents)} delivered</small></article>
                <article className="admin-stat-card"><span className="admin-stat-icon">▦</span><span className="admin-stat-label">Products</span><strong>{products.length}</strong><small>Active in your catalog</small></article>
                <article className="admin-stat-card"><span className="admin-stat-icon">◉</span><span className="admin-stat-label">Units in stock</span><strong>{totalStock}</strong><small>Across all products</small></article>
                <article className={`admin-stat-card ${lowStockProducts.length ? "is-warning" : ""}`}><span className="admin-stat-icon">!</span><span className="admin-stat-label">Low stock</span><strong>{lowStockProducts.length}</strong><small>{lowStockProducts.length ? "Products need attention" : "All products are well stocked"}</small></article>
                <article className={`admin-stat-card ${pendingReviews.length ? "is-highlight" : ""}`}><span className="admin-stat-icon">☆</span><span className="admin-stat-label">Reviews to check</span><strong>{pendingReviews.length}</strong><small>{pendingReviews.length ? "Waiting for your approval" : "You’re all caught up"}</small></article>
              </div>
              <div className="admin-overview-grid">
                <section className="admin-overview-panel">
                  <div className="admin-panel-heading"><div><span className="admin-eyebrow">INVENTORY</span><h3>Stock overview</h3></div><button className="admin-text-button" type="button" onClick={() => setActiveView("products")}>Manage stock →</button></div>
                  <div className="admin-stock-table">
                    <div className="admin-stock-row admin-stock-header"><span>Product</span><span>Price</span><span>Stock</span><span>Status</span></div>
                    {products.map((product) => (
                      <div className="admin-stock-row" key={product.id}>
                        <span className="admin-stock-product"><img src={product.img} alt="" /><b>{product.name}</b></span>
                        <span>${Number(product.price).toFixed(2)}</span>
                        <span>{product.stock} units</span>
                        <span><i className={`admin-stock-dot ${product.stock <= 5 ? "is-low" : ""}`} />{product.stock <= 5 ? "Low stock" : "In stock"}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="admin-overview-panel admin-product-sales">
                  <div className="admin-panel-heading"><div><span className="admin-eyebrow">PRODUCT PERFORMANCE</span><h3>Orders by fragrance</h3></div></div>
                  {productSales.length ? (
                    <div className="admin-product-sales-list">
                      {productSales.map((sale) => (
                        <article key={sale.product_id}>
                          <b>{sale.product_name}</b>
                          <div><span>{sale.order_count} orders</span><span>{sale.units_ordered} ordered · {sale.units_delivered} delivered</span></div>
                          <strong>{formatAdminMoney(sale.revenue_cents)}</strong>
                        </article>
                      ))}
                    </div>
                  ) : <p className="admin-muted">No product sales yet.</p>}
                  <small className="admin-sales-note">Revenue excludes pending cash-on-delivery orders and refunded payments.</small>
                </section>
                <section className="admin-overview-panel admin-shortcuts">
                  <div className="admin-panel-heading"><div><span className="admin-eyebrow">QUICK ACCESS</span><h3>Store tools</h3></div></div>
                  <button type="button" onClick={() => setActiveView("orders")}><span>▤</span><b>Manage orders</b><i>{pendingOrderCount || "→"}</i></button>
                  <button type="button" onClick={() => setActiveView("products")}><span>▦</span><b>Products & inventory</b><i>→</i></button>
                  <button type="button" onClick={() => setActiveView("media")}><span>▧</span><b>Homepage images</b><i>→</i></button>
                  <button type="button" onClick={() => setActiveView("reviews")}><span>☆</span><b>Customer reviews</b><i>{pendingReviews.length || "→"}</i></button>
                </section>
              </div>
            </section>
          )}

          {activeView === "orders" && (
            <section className="admin-section" aria-labelledby="admin-orders-heading">
              <div className="admin-section-heading">
                <div>
                  <span className="admin-eyebrow">SALES & FULFILMENT</span>
                  <h2 id="admin-orders-heading">Orders</h2>
                  <p>Manage customer orders, track fulfilment stages, and update status.</p>
                </div>
                <div className="admin-section-badges">
                  <span className="admin-section-count">{orderCount} total</span>
                  {pendingOrderCount > 0 && (
                    <span className="admin-pending-alert-badge">⏳ {pendingOrderCount} pending</span>
                  )}
                </div>
              </div>

              {/* Status KPI Overview Cards */}
              <div className="admin-order-kpis">
                <button
                  type="button"
                  className={`admin-order-kpi-card ${orderStatusFilter === "all" ? "is-selected" : ""}`}
                  onClick={() => setOrderStatusFilter("all")}
                >
                  <span className="admin-kpi-top"><span className="admin-kpi-icon">▤</span><span>All orders</span></span>
                  <strong>{orders.length}</strong>
                  <small>{formatAdminMoney(orders.reduce((sum, o) => sum + (o.total_cents || 0), 0))} volume</small>
                </button>
                <button
                  type="button"
                  className={`admin-order-kpi-card kpi-pending ${orderStatusFilter === "pending" ? "is-selected" : ""}`}
                  onClick={() => setOrderStatusFilter("pending")}
                >
                  <span className="admin-kpi-top"><span className="admin-kpi-icon">⏳</span><span>Pending</span></span>
                  <strong>{orderCountsByStatus.pending}</strong>
                  <small>{orderCountsByStatus.pending ? "Needs packing" : "All packed"}</small>
                </button>
                <button
                  type="button"
                  className={`admin-order-kpi-card kpi-packed ${orderStatusFilter === "packed" ? "is-selected" : ""}`}
                  onClick={() => setOrderStatusFilter("packed")}
                >
                  <span className="admin-kpi-top"><span className="admin-kpi-icon">📦</span><span>Packed</span></span>
                  <strong>{orderCountsByStatus.packed}</strong>
                  <small>Ready to dispatch</small>
                </button>
                <button
                  type="button"
                  className={`admin-order-kpi-card kpi-shipped ${orderStatusFilter === "shipped" ? "is-selected" : ""}`}
                  onClick={() => setOrderStatusFilter("shipped")}
                >
                  <span className="admin-kpi-top"><span className="admin-kpi-icon">🚚</span><span>Shipped</span></span>
                  <strong>{orderCountsByStatus.shipped}</strong>
                  <small>In transit</small>
                </button>
                <button
                  type="button"
                  className={`admin-order-kpi-card kpi-delivered ${orderStatusFilter === "delivered" ? "is-selected" : ""}`}
                  onClick={() => setOrderStatusFilter("delivered")}
                >
                  <span className="admin-kpi-top"><span className="admin-kpi-icon">✅</span><span>Delivered</span></span>
                  <strong>{orderCountsByStatus.delivered}</strong>
                  <small>{formatAdminMoney(deliveredRevenueCents)} fulfilled</small>
                </button>
                <button
                  type="button"
                  className={`admin-order-kpi-card kpi-cod ${orderStatusFilter === "cod_remittance" ? "is-selected" : ""}`}
                  onClick={() => setOrderStatusFilter("cod_remittance")}
                >
                  <span className="admin-kpi-top"><span className="admin-kpi-icon">💰</span><span>COD Remittances</span></span>
                  <strong>{orderCountsByStatus.cod_remittance || 0}</strong>
                  <small>{orders.filter((o) => o.payment_method === "cash_on_delivery" && o.payment_status === "submitted").length} slip(s) under review</small>
                </button>
              </div>

              {/* Status Filter Tabs & Toolbar */}
              <div className="admin-order-controls-wrapper">
                <nav className="admin-order-status-tabs" aria-label="Order status filter tabs">
                  {ORDER_STATUS_TABS.map((tab) => {
                    const count = tab.id === "all" ? orders.length : (orderCountsByStatus[tab.id] || 0);
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        className={`admin-order-tab-btn ${orderStatusFilter === tab.id ? "is-active" : ""}`}
                        onClick={() => setOrderStatusFilter(tab.id)}
                      >
                        <span className="admin-tab-icon">{tab.icon}</span>
                        <span>{tab.label}</span>
                        <span className={`admin-tab-count tab-count-${tab.id}`}>{count}</span>
                      </button>
                    );
                  })}
                </nav>

                <div className="admin-order-toolbar">
                  <div className="admin-order-search">
                    <span className="admin-search-icon" aria-hidden="true">🔍</span>
                    <input
                      type="search"
                      placeholder="Search orders (ID, customer name, email, phone, city)..."
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                    />
                    {orderSearchQuery && (
                      <button
                        type="button"
                        className="admin-clear-search"
                        onClick={() => setOrderSearchQuery("")}
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="admin-order-toolbar-right">
                    <select
                      className="admin-payment-filter-select"
                      value={orderPaymentFilter}
                      onChange={(e) => setOrderPaymentFilter(e.target.value)}
                      aria-label="Filter by payment method"
                    >
                      <option value="all">All payment methods</option>
                      <option value="cash_on_delivery">💵 Cash on delivery</option>
                      <option value="bank_transfer">🏦 Bank Transfer (IBFT)</option>
                      <option value="jazzcash">📱 JazzCash</option>
                      <option value="easypaisa">📱 EasyPaisa</option>
                      <option value="stripe">💳 Stripe (Card)</option>
                    </select>

                    {orderStatusFilter === "all" && (
                      <label className="admin-group-toggle">
                        <input
                          type="checkbox"
                          checked={orderGroupByStatus}
                          onChange={(e) => setOrderGroupByStatus(e.target.checked)}
                        />
                        <span>Group by status</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* COD Remittance Helper Banner */}
              {orderStatusFilter === "cod_remittance" && (
                <div className="admin-cod-notice-banner">
                  <div className="admin-cod-notice-text">
                    <span className="admin-cod-notice-icon">💰</span>
                    <div>
                      <h4>Cash on Delivery (COD) Payment Clearance & Courier Settlement Hub</h4>
                      <p>
                        Track parcels delivered via Trax, TCS, PostEx, or Leopards. When courier transfers funds to your JazzCash or Bank account, verify the payment slip to clear the order.
                      </p>
                    </div>
                  </div>
                  <a
                    href="/courier"
                    target="_blank"
                    rel="noreferrer"
                    className="admin-open-courier-btn"
                  >
                    Open Courier Remittance Portal ↗
                  </a>
                </div>
              )}

              {/* Active Filter Strip */}
              {(orderStatusFilter !== "all" || orderPaymentFilter !== "all" || orderSearchQuery) && (
                <div className="admin-active-filter-strip">
                  <span>
                    Showing <b>{filteredOrders.length}</b> of <b>{orders.length}</b> orders
                    {orderStatusFilter !== "all" && <span> with filter <b>{orderStatusFilter.replaceAll("_", " ")}</b></span>}
                    {orderPaymentFilter !== "all" && <span> paid via <b>{orderPaymentFilter.replaceAll("_", " ")}</b></span>}
                    {orderSearchQuery && <span> matching <b>“{orderSearchQuery}”</b></span>}
                  </span>
                  <button
                    type="button"
                    className="admin-text-button"
                    onClick={() => {
                      setOrderStatusFilter("all");
                      setOrderPaymentFilter("all");
                      setOrderSearchQuery("");
                    }}
                  >
                    Reset all filters ✕
                  </button>
                </div>
              )}

              {/* Order List / Grouped Sections */}
              {filteredOrders.length > 0 ? (
                orderStatusFilter === "all" && orderGroupByStatus ? (
                  <div className="admin-orders-grouped-container">
                    {groupedOrders.map((group) => (
                      <section className={`admin-order-group-section status-${group.status}`} key={group.status}>
                        <div className="admin-order-group-header">
                          <div className="admin-group-header-left">
                            <span className="admin-group-icon">{group.config.icon}</span>
                            <div>
                              <h3>{group.config.label} orders</h3>
                              <small>{group.config.title} · {group.config.description}</small>
                            </div>
                          </div>
                          <div className="admin-group-header-right">
                            <span className={`admin-group-badge status-${group.status}`}>{group.orders.length} {group.orders.length === 1 ? "order" : "orders"}</span>
                            <span className="admin-group-amount">{formatAdminMoney(group.totalCents)}</span>
                          </div>
                        </div>
                        <div className="admin-orders">
                          {group.orders.map((order) => (
                            <AdminOrderCard
                              key={order.id}
                              order={order}
                              busy={busy}
                              onUpdateStatus={updateOrderStatus}
                              onToggleWhatsApp={toggleOrderWhatsApp}
                              onUpdatePaymentStatus={updateOrderPaymentStatus}
                              onSaveCourier={saveOrderCourier}
                              onSubmitRemittance={submitOrderRemittance}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="admin-orders">
                    {filteredOrders.map((order) => (
                      <AdminOrderCard
                        key={order.id}
                        order={order}
                        busy={busy}
                        onUpdateStatus={updateOrderStatus}
                        onToggleWhatsApp={toggleOrderWhatsApp}
                        onUpdatePaymentStatus={updateOrderPaymentStatus}
                        onSaveCourier={saveOrderCourier}
                        onSubmitRemittance={submitOrderRemittance}
                      />
                    ))}
                    {orderCount > orders.length && <p className="admin-orders-limit">Showing the latest {orders.length} of {orderCount} orders.</p>}
                  </div>
                )
              ) : (
                <div className="admin-empty-reviews">
                  <span aria-hidden="true">▤</span>
                  <h3>No orders match your filter</h3>
                  <p>Try clearing your search query or selecting a different status tab.</p>
                  <button
                    type="button"
                    className="admin-primary-button"
                    onClick={() => {
                      setOrderStatusFilter("all");
                      setOrderPaymentFilter("all");
                      setOrderSearchQuery("");
                    }}
                  >
                    View all orders
                  </button>
                </div>
              )}
            </section>
          )}

          {activeView === "products" && (
          <section className="admin-section">
            <div className="admin-section-heading"><div><span className="admin-eyebrow">CATALOG MANAGEMENT</span><h2>Products & inventory</h2><p>Keep product details, pricing and stock up to date.</p></div><span className="admin-section-count">{products.length} products</span></div>
            <details className="admin-add-product">
              <summary>{busy === "product:create" ? "Adding product…" : "＋ Add a product"}</summary>
              <form className="admin-add-product-form" onSubmit={createProduct}>
                <fieldset className="admin-product-types">
                  <legend>Product type</legend>
                  {[
                    ["fragrance", "Fragrance", "A single fragrance product"],
                    ["set", "Gift set", "A curated set or collection"],
                  ].map(([value, label, description]) => (
                    <label className={newProduct.type === value ? "is-selected" : ""} key={value}>
                      <input
                        type="radio"
                        name="product-type"
                        value={value}
                        checked={newProduct.type === value}
                        onChange={() => updateNewProduct("type", value)}
                      />
                      <span><b>{label}</b><small>{description}</small></span>
                    </label>
                  ))}
                </fieldset>
                <label>Product name<input value={newProduct.name} onChange={(event) => updateNewProduct("name", event.target.value)} maxLength="255" required /></label>
                <label>Short name<input value={newProduct.short} onChange={(event) => updateNewProduct("short", event.target.value)} maxLength="120" required /></label>
                <label>Price<input type="number" min="0.01" max="100000" step="0.01" value={newProduct.price} onChange={(event) => updateNewProduct("price", event.target.value)} required /></label>
                <label>Available stock<input type="number" min="0" max="100000" step="1" value={newProduct.stock} onChange={(event) => updateNewProduct("stock", event.target.value)} required /></label>
                <label>Size<input value={newProduct.size} onChange={(event) => updateNewProduct("size", event.target.value)} maxLength="80" placeholder="50 ml" required /></label>
                <label>Tagline<input value={newProduct.tag} onChange={(event) => updateNewProduct("tag", event.target.value)} maxLength="255" required /></label>
                <div className="admin-new-product-image admin-wide">
                  <label>Product image URL<input value={newProduct.img} onChange={(event) => updateNewProduct("img", event.target.value)} maxLength="2048" placeholder="Upload an image or paste its URL" required /></label>
                  <label className="btn line cap admin-new-product-upload">
                    {busy === "upload:new-product" ? "Uploading image…" : "Upload product image"}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={Boolean(busy)} onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      uploadNewProductImage(file);
                    }} />
                  </label>
                  {newProduct.img && <img key={newProduct.img} className="admin-new-product-preview" src={newProduct.img} alt="New product preview" onError={(event) => { event.currentTarget.hidden = true; }} />}
                  <small>JPEG, PNG, WebP or AVIF · up to 5 MB</small>
                </div>
                <label className="admin-wide">Description<textarea rows="3" value={newProduct.desc} onChange={(event) => updateNewProduct("desc", event.target.value)} required /></label>
                <label>Image position<input value={newProduct.pos} onChange={(event) => updateNewProduct("pos", event.target.value)} maxLength="80" required /></label>
                <button className="btn cap admin-add-submit" type="submit" disabled={Boolean(busy)}>{busy === "product:create" ? "Adding…" : "Add product to store"}</button>
              </form>
            </details>
            <div className="admin-inventory">
              <div className="admin-inventory-header">
                <span>PRODUCT</span><span>PRICE</span><span>AVAILABLE STOCK</span><span>STATUS</span><span>ACTION</span>
              </div>
              {products.map((product) => (
                <article className="admin-inventory-item" key={product.id}>
                  <div className="admin-inventory-row">
                    <div className="admin-inventory-product">
                      <img src={product.img} alt="" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
                      <div><b>{product.name}</b><small>{product.type === "set" ? "Gift set" : product.size} · {product.id}</small></div>
                    </div>
                    <label className="admin-inline-input"><span className="admin-mobile-label">Price</span><span className="admin-input-prefix">$</span><input aria-label={`${product.name} price`} type="number" min="0.01" step="0.01" value={product.price} onChange={(event) => updateProduct(product.id, "price", Number(event.target.value))} /></label>
                    <label className="admin-inline-input"><span className="admin-mobile-label">Available stock</span><input aria-label={`${product.name} stock`} type="number" min="0" step="1" value={product.stock} onChange={(event) => updateProduct(product.id, "stock", Number(event.target.value))} /><span className="admin-units">units</span></label>
                    <span className={`admin-stock-badge ${product.stock <= 5 ? "is-low" : ""}`}><i />{product.stock <= 5 ? "Low stock" : "In stock"}</span>
                    <button className="admin-save-row" type="button" disabled={Boolean(busy)} onClick={() => saveProduct(product)}>
                      {busy === `product:${product.id}` ? "Saving…" : "Save"}
                    </button>
                  </div>
                  <details className="admin-product-details">
                    <summary>Edit product details</summary>
                    <div className="admin-product-editor">
                      <div className="admin-image-preview">
                        <img src={product.img} alt={product.name} onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
                        <label className="btn line cap admin-upload">
                          {busy === `upload:product-${product.id}` ? "Uploading…" : busy === `product-image:${product.id}` ? "Saving…" : "Upload image"}
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={Boolean(busy)} onChange={(event) => uploadImage(`product-${product.id}`, event.target.files?.[0])} />
                        </label>
                      </div>
                      <div className="admin-fields">
                        <label>Product name<input value={product.name} onChange={(event) => updateProduct(product.id, "name", event.target.value)} /></label>
                        <label>Short name<input value={product.short} onChange={(event) => updateProduct(product.id, "short", event.target.value)} /></label>
                        <label>Size<input value={product.size} onChange={(event) => updateProduct(product.id, "size", event.target.value)} /></label>
                        <label>Image URL<input value={product.img} onChange={(event) => updateProduct(product.id, "img", event.target.value)} /></label>
                        <label>Image position<input value={product.pos} onChange={(event) => updateProduct(product.id, "pos", event.target.value)} /></label>
                        <label>Tagline<input value={product.tag} onChange={(event) => updateProduct(product.id, "tag", event.target.value)} /></label>
                        <label className="admin-wide">Description<textarea rows="3" value={product.desc} onChange={(event) => updateProduct(product.id, "desc", event.target.value)} /></label>
                      </div>
                      <button className="btn line cap admin-delete-product" type="button" disabled={Boolean(busy)} onClick={() => deleteProduct(product)}>
                        {busy === `product:delete:${product.id}` ? "Deleting…" : "Delete product"}
                      </button>
                    </div>
                  </details>
                </article>
              ))}
            </div>
          </section>
          )}

          {activeView === "media" && (
          <section className="admin-section">
            <div className="admin-section-heading"><div><span className="admin-eyebrow">STOREFRONT EDITOR</span><h2>Homepage content</h2><p>Manage the homepage images, headings, descriptions and button labels shown to customers.</p></div><span className="admin-section-count">{sections.length} sections</span></div>
            <div className="admin-sections admin-media-grid">
              {sections.map((section) => (
                <article className={`admin-card admin-media-card ${section.hasImage ? "" : "admin-copy-card"}`} key={section.content_key}>
                  {section.hasImage && <div className="admin-media-preview"><img src={section.image_url} alt={section.alt_text || section.label} onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} /><span>LIVE PREVIEW</span></div>}
                  <div className="admin-media-fields">
                    <div className="admin-media-title"><span className="admin-media-icon">{section.hasImage ? "▧" : "T"}</span><div><h3>{section.label}</h3><small>{section.hasImage ? "Homepage image" : "Homepage copy"}</small></div></div>
                    {section.hasImage && <>
                      <label>Image URL<input value={section.image_url} onChange={(event) => updateSection(section.content_key, "image_url", event.target.value)} /></label>
                      <label>Alt text<input value={section.alt_text} onChange={(event) => updateSection(section.content_key, "alt_text", event.target.value)} /></label>
                      {section.hasVideo && <label className="admin-wide">Background video URL<input value={section.video_url} maxLength="2048" placeholder="/assets/videos/hero_bg.mp4" onChange={(event) => updateSection(section.content_key, "video_url", event.target.value)} /></label>}
                    </>}
                    {section.hasCopy && <>
                      <label>Eyebrow<input value={section.eyebrow_text} maxLength="255" onChange={(event) => updateSection(section.content_key, "eyebrow_text", event.target.value)} /></label>
                      <label>Heading<input value={section.heading_text} maxLength="500" onChange={(event) => updateSection(section.content_key, "heading_text", event.target.value)} /></label>
                      <label className="admin-wide">Description<textarea rows="3" value={section.body_text} onChange={(event) => updateSection(section.content_key, "body_text", event.target.value)} /></label>
                      <label>Button label<input value={section.button_text} maxLength="120" onChange={(event) => updateSection(section.content_key, "button_text", event.target.value)} /></label>
                      <label>Button link<input value={section.button_href} maxLength="2048" placeholder="/shop" onChange={(event) => updateSection(section.content_key, "button_href", event.target.value)} /></label>
                    </>}
                    <div className="admin-actions">
                      {section.hasImage && <label className="btn line cap admin-upload">
                          {busy === `upload:${section.content_key}` ? "Uploading…" : "Upload image"}
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={Boolean(busy)} onChange={(event) => uploadImage(section.content_key, event.target.files?.[0])} />
                        </label>}
                      <button className="btn cap" type="button" disabled={Boolean(busy)} onClick={() => saveSection(section)}>
                        {busy === `section:${section.content_key}` ? "Saving…" : section.hasImage && !section.hasCopy ? "Save image" : "Save section"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <section className="admin-library" aria-labelledby="admin-library-title">
              <div className="admin-library-heading">
                <div><span className="admin-eyebrow">UPLOADS</span><h2 id="admin-library-title">Image library</h2><p>Choose an image to assign it, or delete files that are no longer in use.</p></div>
                <label className="btn cap admin-library-upload">
                  {busy === "upload:library" ? "Uploading…" : "Upload to library"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={Boolean(busy)} onChange={(event) => uploadLibraryImage(event.target.files?.[0])} />
                </label>
              </div>
              <label className="admin-library-target">Use selected image for
                <select value={mediaTarget} onChange={(event) => setMediaTarget(event.target.value)}>
                  {sections.filter((section) => section.hasImage).map((section) => <option key={section.content_key} value={`section:${section.content_key}`}>Section · {section.label}</option>)}
                  {products.map((product) => <option key={product.id} value={`product:${product.id}`}>Product · {product.name}</option>)}
                </select>
              </label>
              {mediaImages.length ? (
                <div className="admin-library-grid">
                  {mediaImages.map((image) => (
                    <article className="admin-library-card" key={image.name}>
                      <img src={image.url} alt="" />
                      <div className="admin-library-info">
                        <code>{image.name}</code>
                        <small>{image.usedBy.length ? `In use: ${image.usedBy.join(", ")}` : "Not currently in use"}</small>
                        <div className="admin-actions">
                          <button className="btn cap" type="button" disabled={Boolean(busy)} onClick={() => assignLibraryImage(image.url)}>Use image</button>
                          <button className="btn line cap" type="button" disabled={Boolean(busy) || image.usedBy.length > 0} title={image.usedBy.length ? "Replace this image and save before deleting it." : "Delete this unused image"} onClick={() => deleteLibraryImage(image)}>
                            {busy === `delete:${image.name}` ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="admin-library-empty">No uploaded images yet. Upload one to start your library.</p>}
            </section>
          </section>
          )}

          {activeView === "reviews" && (
          <section className="admin-section">
            <div className="admin-section-heading" style={{ flexWrap: "wrap", gap: 16 }}>
              <div>
                <span className="admin-eyebrow">CUSTOMER FEEDBACK &amp; REVIEWS</span>
                <h2>Real Product Reviews Management</h2>
                <p>
                  Manage real customer reviews submitted from product pages, or manually add authentic reviews received via WhatsApp, phone, or in-store.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  className="btn cap"
                  onClick={() => setShowAddReviewModal(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <span>+ Add Real Review</span>
                </button>
              </div>
            </div>

            {/* Sub-Tabs: Pending vs Published */}
            <div style={{ display: "flex", gap: 10, borderBottom: "1px solid #e8e4dc", paddingBottom: 12, marginBottom: 20 }}>
              <button
                type="button"
                className={`admin-order-filter-pill ${reviewSubTab === "pending" ? "is-active" : ""}`}
                onClick={() => setReviewSubTab("pending")}
              >
                Pending Moderation ({pendingReviews.length})
              </button>
              <button
                type="button"
                className={`admin-order-filter-pill ${reviewSubTab === "approved" ? "is-active" : ""}`}
                onClick={() => setReviewSubTab("approved")}
              >
                Live Published Reviews ({approvedReviews.length})
              </button>
            </div>

            {/* Modal: Add Real Review */}
            {showAddReviewModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
                <div style={{ background: "#ffffff", color: "#1d1710", padding: 28, borderRadius: 12, maxWidth: 540, width: "100%", boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 22 }}>Add Real Customer Review</h3>
                    <button type="button" onClick={() => setShowAddReviewModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
                  </div>
                  <p style={{ fontSize: 14, color: "#6b5c48", margin: "0 0 16px" }}>
                    Add real feedback received via WhatsApp, Instagram, or phone order. It will publish directly to the product page.
                  </p>
                  <form onSubmit={createReview}>
                    <label style={{ display: "block", marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Fragrance Product</span>
                      <select
                        value={newReviewForm.productId}
                        onChange={(e) => setNewReviewForm({ ...newReviewForm, productId: e.target.value })}
                        style={{ display: "block", width: "100%", padding: "10px", marginTop: 4, borderRadius: 6, border: "1px solid #c9a36a" }}
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.short})</option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: "block", marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Customer Name</span>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Tariq Mehmood (Lahore)"
                        value={newReviewForm.customerName}
                        onChange={(e) => setNewReviewForm({ ...newReviewForm, customerName: e.target.value })}
                        style={{ display: "block", width: "100%", padding: "10px", marginTop: 4, borderRadius: 6, border: "1px solid #c9a36a" }}
                      />
                    </label>

                    <label style={{ display: "block", marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Rating (Stars)</span>
                      <select
                        value={newReviewForm.rating}
                        onChange={(e) => setNewReviewForm({ ...newReviewForm, rating: Number(e.target.value) })}
                        style={{ display: "block", width: "100%", padding: "10px", marginTop: 4, borderRadius: 6, border: "1px solid #c9a36a" }}
                      >
                        <option value="5">★★★★★ 5 Stars (Exceptional)</option>
                        <option value="4">★★★★☆ 4 Stars (Very Good)</option>
                        <option value="3">★★★☆☆ 3 Stars (Average)</option>
                        <option value="2">★★☆☆☆ 2 Stars (Fair)</option>
                        <option value="1">★☆☆☆☆ 1 Star (Poor)</option>
                      </select>
                    </label>

                    <label style={{ display: "block", marginBottom: 14 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Review Text</span>
                      <textarea
                        required
                        rows="4"
                        placeholder="Customer's genuine feedback on longevity, sillage, bottle quality..."
                        value={newReviewForm.reviewText}
                        onChange={(e) => setNewReviewForm({ ...newReviewForm, reviewText: e.target.value })}
                        style={{ display: "block", width: "100%", padding: "10px", marginTop: 4, borderRadius: 6, border: "1px solid #c9a36a" }}
                      />
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={newReviewForm.verifiedPurchase}
                        onChange={(e) => setNewReviewForm({ ...newReviewForm, verifiedPurchase: e.target.checked })}
                      />
                      <span style={{ fontSize: 14 }}>Mark as &ldquo;Verified Purchase&rdquo; (Badge shown publicly)</span>
                    </label>

                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <button type="button" className="btn line cap" onClick={() => setShowAddReviewModal(false)}>Cancel</button>
                      <button type="submit" className="btn cap" disabled={busy === "review:create"}>
                        {busy === "review:create" ? "Publishing…" : "Publish Review Now"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* View 1: Pending Reviews */}
            {reviewSubTab === "pending" && (
              pendingReviews.length ? (
                <div className="admin-reviews">
                  {pendingReviews.map((review) => (
                    <article className="admin-card admin-review-card" key={review.id}>
                      <div className="admin-card-heading">
                        <div>
                          <span className="cap dk">{products.find((p) => p.id === review.product_id)?.name || review.product_id}</span>
                          <h3>{review.customer_name}</h3>
                          <small className="admin-review-email">{review.customer_email || "Direct / Web Submission"}</small>
                        </div>
                        <span className="stars" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                      </div>
                      <span className={`admin-review-verified ${review.verified_purchase ? "is-verified" : ""}`}>{review.verified_purchase ? "✓ Verified purchase" : "Purchase not verified"}</span>
                      <p style={{ margin: "14px 0", fontSize: 15 }}>{review.review_text}</p>
                      <time dateTime={review.created_at} style={{ fontSize: 12, color: "#8a7757" }}>{new Date(review.created_at).toLocaleDateString()}</time>
                      <div className="admin-actions" style={{ marginTop: 14 }}>
                        <button className="btn cap" type="button" disabled={Boolean(busy)} onClick={() => moderateReview(review, "approved")}>
                          {busy === `review:${review.id}` ? "Saving…" : "Approve & Publish Live"}
                        </button>
                        <button className="btn line cap" type="button" disabled={Boolean(busy)} onClick={() => moderateReview(review, "rejected")}>Reject</button>
                        <button className="btn line cap" type="button" style={{ color: "#c53030", borderColor: "#c53030" }} disabled={Boolean(busy)} onClick={() => deleteReview(review.id)}>Delete ✕</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="admin-empty-reviews">
                  <span aria-hidden="true">☆</span>
                  <h3>No pending reviews</h3>
                  <p>All submitted customer reviews have been moderated. You can also add real customer feedback manually using the button above.</p>
                </div>
              )
            )}

            {/* View 2: Live Published Reviews */}
            {reviewSubTab === "approved" && (
              approvedReviews.length ? (
                <div className="admin-reviews">
                  {approvedReviews.map((review) => (
                    <article className="admin-card admin-review-card" key={review.id} style={{ borderLeft: "4px solid #4a6b3a" }}>
                      <div className="admin-card-heading">
                        <div>
                          <span className="cap dk">{products.find((p) => p.id === review.product_id)?.name || review.product_id}</span>
                          <h3>{review.customer_name}</h3>
                          <small className="admin-review-email" style={{ color: "#4a6b3a", fontWeight: 600 }}>● Live on Storefront</small>
                        </div>
                        <span className="stars" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                      </div>
                      <span className={`admin-review-verified ${review.verified_purchase ? "is-verified" : ""}`}>{review.verified_purchase ? "✓ Verified purchase" : "Purchase not verified"}</span>
                      <p style={{ margin: "14px 0", fontSize: 15 }}>{review.review_text}</p>
                      <time dateTime={review.created_at} style={{ fontSize: 12, color: "#8a7757" }}>{new Date(review.created_at).toLocaleDateString()}</time>
                      <div className="admin-actions" style={{ marginTop: 14 }}>
                        <button className="btn line cap" type="button" disabled={Boolean(busy)} onClick={() => moderateReview(review, "rejected")}>
                          Unpublish (Hide)
                        </button>
                        <button className="btn line cap" type="button" style={{ color: "#c53030", borderColor: "#c53030" }} disabled={Boolean(busy)} onClick={() => deleteReview(review.id)}>
                          Delete ✕
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="admin-empty-reviews">
                  <span aria-hidden="true">⚜️</span>
                  <h3>No live reviews published yet</h3>
                  <p>When you approve customer reviews or add them using the &ldquo;+ Add Real Review&rdquo; button, they will appear here and on the storefront.</p>
                </div>
              )
            )}
          </section>
          )}
        </div>
      </div>
    </main>
  );
}
