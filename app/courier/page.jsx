"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CourierPortal() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [order, setOrder] = useState(null);

  // Remittance form fields
  const [courierName, setCourierName] = useState("Trax");
  const [courierCn, setCourierCn] = useState("");
  const [remittanceRef, setRemittanceRef] = useState("");
  const [remittanceAmount, setRemittanceAmount] = useState("");
  const [proofImage, setProofImage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-search if query param present in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const initialQuery = params.get("order") || params.get("cn") || "";
      if (initialQuery) {
        setQuery(initialQuery);
        handleLookup(initialQuery);
      }
    }
  }, []);

  async function handleLookup(lookupQuery) {
    const q = (lookupQuery || query).trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setSuccessMessage("");
    setOrder(null);

    try {
      const res = await fetch(`/api/courier/remittance?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order not found.");
      setOrder(data);
      if (data.courierName) setCourierName(data.courierName);
      if (data.courierCn) setCourierCn(data.courierCn);
      if (data.totalCents) setRemittanceAmount(String(data.totalCents / 100));
    } catch (err) {
      setError(err.message || "Could not find order. Please verify the ID or CN#.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("Payment slip image size must be under 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setProofImage(event.target.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmitRemittance(e) {
    e.preventDefault();
    if (!order) return;
    if (!remittanceRef.trim() && !proofImage) {
      setError("Please provide a Transaction/Reference ID or upload a Payment Slip Screenshot.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/courier/remittance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderId,
          courierName: courierName.trim(),
          courierCn: courierCn.trim(),
          remittanceRef: remittanceRef.trim(),
          remittanceAmountCents: Math.round(Number(remittanceAmount) * 100),
          proofImage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed.");

      setSuccessMessage(data.message || "Payment proof submitted successfully!");
      setOrder((current) => current ? { ...current, paymentStatus: "submitted", remittanceReference: remittanceRef } : null);
    } catch (err) {
      setError(err.message || "Failed to submit remittance.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="courier-portal-container">
      <header className="courier-portal-header">
        <Link href="/" className="courier-portal-brand">
          Maison Ihsaan Ali
        </Link>
        <h1>Courier COD Remittance & Settlement Portal</h1>
        <p>
          Submit COD cash remittance details, bank transaction references, and payment slip screenshots directly to the Maison Ihsaan Ali finance team.
        </p>
      </header>

      <main className="courier-portal-main">
        {/* Step 1: Lookup */}
        <section className="courier-lookup-card">
          <label htmlFor="courier-query-input">
            <strong>1. Search Order by Order ID or Courier CN#</strong>
          </label>
          <div className="courier-search-bar">
            <input
              id="courier-query-input"
              type="text"
              placeholder="e.g. IH90D7D9FD02 or TRX-98214"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
            <button
              type="button"
              className="courier-primary-btn"
              disabled={loading || !query.trim()}
              onClick={() => handleLookup()}
            >
              {loading ? "Searching…" : "Find Order →"}
            </button>
          </div>
          {error && <div className="courier-error-banner">⚠️ {error}</div>}
          {successMessage && <div className="courier-success-banner">✅ {successMessage}</div>}
        </section>

        {/* Step 2: Order Information */}
        {order && (
          <section className="courier-order-details-card">
            <div className="courier-order-header">
              <div>
                <span className="courier-order-tag">ORDER DETAILS</span>
                <h2>#{order.orderId}</h2>
                <small>Destination: {order.city || "Pakistan"}</small>
              </div>
              <div className="courier-badges">
                <span className={`courier-status-badge status-${order.status}`}>
                  🚚 Delivery: {order.status}
                </span>
                <span className={`courier-payment-badge payment-${order.paymentStatus}`}>
                  {order.paymentStatus === "paid" ? "✅ Payment: Paid & Verified" :
                   order.paymentStatus === "submitted" ? "🔍 Payment: Proof Under Review" :
                   "⏳ Payment: Pending Remittance"}
                </span>
              </div>
            </div>

            <div className="courier-amount-strip">
              <span>Total COD Cash to Remit:</span>
              <strong>Rs. {(order.totalCents / 100).toLocaleString()}</strong>
            </div>

            {/* Step 3: Remittance Form */}
            <form onSubmit={handleSubmitRemittance} className="courier-remittance-form">
              <h3>2. Record Payment Remittance & Attach Slip</h3>

              <div className="courier-form-grid">
                <div className="courier-form-group">
                  <label htmlFor="courier-name-select">Courier Company *</label>
                  <select
                    id="courier-name-select"
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    required
                  >
                    <option value="Trax">Trax Express</option>
                    <option value="TCS">TCS</option>
                    <option value="PostEx">PostEx</option>
                    <option value="Leopards">Leopards Courier</option>
                    <option value="Call Courier">Call Courier</option>
                    <option value="M&P">M&P Express</option>
                    <option value="Rider / Self">Company Rider / Self</option>
                    <option value="Other">Other Courier</option>
                  </select>
                </div>

                <div className="courier-form-group">
                  <label htmlFor="courier-cn-input">Courier Consignment Number (CN#)</label>
                  <input
                    id="courier-cn-input"
                    type="text"
                    placeholder="e.g. TRX-9821448"
                    value={courierCn}
                    onChange={(e) => setCourierCn(e.target.value)}
                  />
                </div>

                <div className="courier-form-group">
                  <label htmlFor="remittance-ref-input">Transaction TID / Bank Deposit Ref *</label>
                  <input
                    id="remittance-ref-input"
                    type="text"
                    placeholder="e.g. JazzCash TID #9281948 or Trax Batch #410"
                    value={remittanceRef}
                    onChange={(e) => setRemittanceRef(e.target.value)}
                  />
                </div>

                <div className="courier-form-group">
                  <label htmlFor="remittance-amount-input">Amount Remitted (PKR) *</label>
                  <input
                    id="remittance-amount-input"
                    type="number"
                    step="any"
                    placeholder="e.g. 12800"
                    value={remittanceAmount}
                    onChange={(e) => setRemittanceAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Payment Slip Screenshot Upload */}
              <div className="courier-upload-box">
                <label className="courier-upload-label">
                  <strong>📸 Attach Payment Slip / Bank Screenshot (Proof)</strong>
                  <span>Upload JazzCash receipt, bank deposit slip, or courier remittance sheet</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="courier-file-input"
                  />
                </label>

                {proofImage && (
                  <div className="courier-proof-preview">
                    <span>Attached Payment Proof:</span>
                    <img src={proofImage} alt="Payment slip preview" />
                    <button
                      type="button"
                      className="courier-remove-proof-btn"
                      onClick={() => setProofImage("")}
                    >
                      Remove Slip ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="courier-form-actions">
                <button
                  type="submit"
                  className="courier-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? "Submitting Payment Proof…" : "Submit Remittance Proof to Admin →"}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
