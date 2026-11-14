"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { money } from "./catalog";
import { useStore } from "./store-context";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getReturnPath() {
  const next = new URLSearchParams(window.location.search).get("next") || "";
  if (!next.startsWith("/") || next.startsWith("//")) return "";

  try {
    const destination = new URL(next, window.location.origin);
    return destination.origin === window.location.origin
      ? `${destination.pathname}${destination.search}${destination.hash}`
      : "";
  } catch {
    return "";
  }
}

function GoogleButton({ label = "Continue with Google" }) {
  return (
    <a href="/api/auth/google" className="google-auth-btn">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
      </svg>
      <span>{label}</span>
    </a>
  );
}

export default function AccountPanel() {
  const { user, setUser, wishlist, authConfigured, authLoading, productById } = useStore();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("reset_token");
    if (token) setResetToken(token);

    const googleError = params.get("google_error");
    if (googleError === "not_configured") {
      setError("Google Login Setup: Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local to activate live Google authentication.");
    } else if (googleError) {
      setError("Google sign-in could not be completed. Please try again or use your email and password.");
    }

    if (params.get("google_success")) {
      setMessage("Signed in with Google successfully.");
    }
  }, []);

  useEffect(() => {
    if (!user || !authConfigured) {
      setOrders([]);
      return undefined;
    }

    let cancelled = false;
    setLoadingOrders(true);
    async function loadOrders() {
      try {
        const response = await fetch("/api/orders/account");
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "We couldn’t load your orders.");
        if (!cancelled) {
          setOrders(result.orders || []);
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "We couldn’t load your orders.");
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    }
    loadOrders();
    return () => { cancelled = true; };
  }, [user, authConfigured]);

  async function submitAuth(event, createAccount) {
    event.preventDefault();
    setError("");
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email").toString().trim().toLowerCase();
    const password = formData.get("password").toString();
    const name = formData.get("name")?.toString().trim() || "";
    const phone = formData.get("phone")?.toString().trim() || "";

    if (!EMAIL.test(email) || password.length < 8 ||
      (createAccount && (!name || phone.length < 7 || phone.length > 50 || password !== formData.get("confirm")))) {
      setError(createAccount
        ? "Enter your name, a valid email and phone, an 8+ character password, and matching confirmation."
        : "Enter a valid email and a password of at least 8 characters.");
      return;
    }

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: createAccount ? "signup" : "login", email, password, name, phone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sign-in failed.");
      setUser(result.user);
      setMessage(createAccount ? "Your account is ready." : "You’re signed in.");
      const returnPath = getReturnPath();
      if (returnPath) window.location.assign(returnPath);
    } catch (authError) {
      setError(authError.message || "Sign-in failed. Please try again.");
    }
  }

  async function submitForgotPassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email")?.toString().trim().toLowerCase();
    if (!EMAIL.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "forgot_password", email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not dispatch reset request.");
      setMessage(result.message || "If an account exists with that email, a password reset link has been dispatched.");
      setShowForgot(false);
    } catch (err) {
      setError(err.message || "Could not request password reset.");
    }
  }

  async function submitResetPassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const password = formData.get("password")?.toString() || "";
    const confirm = formData.get("confirm")?.toString() || "";

    if (password.length < 8 || password !== confirm) {
      setError("Password must be at least 8 characters and match confirmation.");
      return;
    }

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password", token: resetToken, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not reset password.");
      setUser(result.user);
      setResetToken("");
      setMessage("Your password has been successfully reset.");
    } catch (err) {
      setError(err.message || "Password reset failed.");
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
      setUser(null);
      setMessage("");
      setError("");
    } catch (signOutError) {
      setError(signOutError.message || "Could not sign out. Please try again.");
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name").toString().trim();
    const phone = formData.get("phone").toString().trim();
    if (!name || (phone && (phone.length < 7 || phone.length > 50))) {
      setError("Enter your name and a valid phone number.");
      return;
    }
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "profile", name, phone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We couldn’t update your profile.");
      setUser(result.user);
      setError("");
      setMessage("Profile saved.");
    } catch (updateError) {
      setError(updateError.message || "We couldn’t update your profile.");
    }
  }

  if (authLoading) return (
    <main className="inner wrap page">
      <span className="cap dk">My account</span><h1 className="ph">My account</h1>
      <p className="notice" role="status">Checking account service…</p>
    </main>
  );

  if (!authConfigured) return (
    <main className="inner wrap page">
      <span className="cap dk">My account</span><h1 className="ph">Account setup required</h1>
      <p className="notice">Start MySQL and run <code>npm run db:setup</code> to enable secure local customer accounts.</p>
    </main>
  );

  if (resetToken && !user) {
    return (
      <main className="inner wrap page">
        <span className="cap dk">Security</span><h1 className="ph">Set new password</h1>
        <form className="f checkout-form" onSubmit={submitResetPassword} style={{ maxWidth: 440 }}>
          <label>New password (8+ characters)<input name="password" type="password" autoComplete="new-password" minLength="8" required /></label>
          <label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" minLength="8" required /></label>
          <p className="status-message" role="alert">{error}</p>
          <button className="btn cap">Update password</button>
        </form>
      </main>
    );
  }

  if (!user) return (
    <main className="inner wrap page">
      <span className="cap dk">My account</span><h1 className="ph">Sign in or create an account</h1>
      <div className="story account-forms">
        {!showForgot ? (
          <form className="f checkout-form" onSubmit={(event) => submitAuth(event, false)}>
            <h2 style={{ fontSize: 30, marginBottom: 16 }}>Sign in</h2>
            <GoogleButton label="Sign in with Google" />
            <div className="auth-divider"><span>or sign in with email</span></div>
            <label>Email<input name="email" type="email" autoComplete="email" required /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" minLength="8" required /></label>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <button className="btn cap">Sign in</button>
              <button
                type="button"
                className="ul"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}
                onClick={() => { setShowForgot(true); setError(""); setMessage(""); }}
              >
                Forgot password?
              </button>
            </div>
          </form>
        ) : (
          <form className="f checkout-form" onSubmit={submitForgotPassword}>
            <h2 style={{ fontSize: 30 }}>Reset password</h2>
            <p style={{ fontSize: "14px", color: "#666" }}>Enter your account email. We will dispatch a secure link to reset your password.</p>
            <label>Email<input name="email" type="email" autoComplete="email" required /></label>
            <div style={{ display: "flex", gap: "10px", marginTop: 10 }}>
              <button className="btn cap">Send reset link</button>
              <button
                type="button"
                className="btn line cap"
                onClick={() => { setShowForgot(false); setError(""); setMessage(""); }}
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}

        <form className="f checkout-form" onSubmit={(event) => submitAuth(event, true)}>
          <h2 style={{ fontSize: 30, marginBottom: 16 }}>Create account</h2>
          <GoogleButton label="Sign up with Google" />
          <div className="auth-divider"><span>or register with email</span></div>
          <label>Full name<input name="name" autoComplete="name" placeholder="Ihsaan Ali" required /></label>
          <label>Email<input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label>
          <label>Phone<input name="phone" type="tel" autoComplete="tel" placeholder="03XXXXXXXXX" minLength="7" maxLength="50" required /></label>
          <label>Password (8+ characters)<input name="password" type="password" autoComplete="new-password" minLength="8" required /></label>
          <label>Confirm password<input name="confirm" type="password" autoComplete="new-password" minLength="8" required /></label>
          <button className="btn cap">Create account</button>
        </form>
      </div>
      <p className="status-message" role="alert">{error}</p>
      {message && <p className="notice" role="status" style={{ margin: "14px 0" }}>{message}</p>}
    </main>
  );

  const displayName = user.user_metadata?.full_name || user.email;
  return (
    <main className="inner wrap page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 12 }}>
        <div><span className="cap dk">My account</span><h1 className="ph">Hello, {displayName.split(" ")[0]}</h1></div>
        <button className="btn line cap" type="button" onClick={signOut}>Sign out</button>
      </div>
      <div className="story" style={{ marginTop: 20 }}>
        <section>
          <h2 style={{ fontSize: 32 }}>Orders</h2>
          {loadingOrders ? <p className="empty">Loading your orders…</p> : orders.length ? orders.map((order) => (
            <article className="order-row" key={order.id}>
              <div><b>{order.id}</b><br />{new Date(order.createdAt).toLocaleDateString()} · {order.status.replaceAll("_", " ")}</div>
              <div style={{ textAlign: "right" }}>
                {money(order.total / 100)}<br />
                {order.items.map((item) => productById(item.product_id)?.name || "Store product").join(", ")}<br />
                <Link className="ul" href={`/track?order=${encodeURIComponent(order.id)}`}>Track order</Link>
              </div>
            </article>
          )) : <p className="empty">No orders yet. <Link className="ul" href="/shop">Shop the collection</Link>.</p>}
          <p><Link className="ul" href="/wishlist">View wishlist ({wishlist.length})</Link></p>
        </section>
        <form className="f checkout-form" onSubmit={saveProfile}>
          <h2 style={{ fontSize: 32 }}>Profile</h2>
          <label>Full name<input name="name" defaultValue={displayName} required /></label>
          <label>Email<input value={user.email || ""} readOnly /></label>
          <label>Phone<input name="phone" type="tel" autoComplete="tel" defaultValue={user.user_metadata?.phone || ""} minLength="7" maxLength="50" /></label>
          <p className="status-message" role="alert">{error}</p>
          <p className="status-message" role="status">{message}</p>
          <button className="btn cap">Save changes</button>
        </form>
      </div>
    </main>
  );
}
