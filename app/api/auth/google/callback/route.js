import { randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDatabasePool } from "../../../../../lib/server/db";
import { hashPassword } from "../../../../../lib/server/passwords";
import { createSession } from "../../../../../lib/server/session";

export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const appUrl = process.env.APP_URL || new URL(request.url).origin;
  const cookieStore = await cookies();
  const savedState = cookieStore.get("google_oauth_state")?.value;
  const returnTo = cookieStore.get("google_oauth_return_to")?.value || "/account";

  // Clean up oauth cookies
  cookieStore.delete("google_oauth_state");
  cookieStore.delete("google_oauth_return_to");

  if (errorParam || !code) {
    const redirectUrl = new URL(returnTo, appUrl);
    redirectUrl.searchParams.set("google_error", errorParam || "access_denied");
    return NextResponse.redirect(redirectUrl);
  }

  if (!state || state !== savedState) {
    const redirectUrl = new URL(returnTo, appUrl);
    redirectUrl.searchParams.set("google_error", "invalid_state");
    return NextResponse.redirect(redirectUrl);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Google token exchange error:", tokenData);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set("google_error", "token_exchange_failed");
      return NextResponse.redirect(redirectUrl);
    }

    // 2. Fetch user profile from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userRes.json();
    if (!userRes.ok || !googleUser.email) {
      console.error("Google userinfo error:", googleUser);
      const redirectUrl = new URL(returnTo, appUrl);
      redirectUrl.searchParams.set("google_error", "userinfo_failed");
      return NextResponse.redirect(redirectUrl);
    }

    const email = googleUser.email.trim().toLowerCase();
    const fullName = googleUser.name ? googleUser.name.trim() : email.split("@")[0];

    // 3. Find or create user in MySQL
    const pool = getDatabasePool();
    const [rows] = await pool.execute(
      "SELECT id, email, full_name, phone, role FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    let userId;
    if (rows.length) {
      userId = rows[0].id;
      // If user has an empty name, update with Google name
      if (!rows[0].full_name && fullName) {
        await pool.execute("UPDATE users SET full_name = ? WHERE id = ?", [fullName, userId]);
      }
    } else {
      userId = randomUUID();
      const dummyPassword = await hashPassword(randomBytes(32).toString("hex"));
      await pool.execute(
        "INSERT INTO users (id, email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, '', 'customer')",
        [userId, email, dummyPassword, fullName],
      );
    }

    // 4. Create active user session
    await createSession(userId);

    const redirectUrl = new URL(returnTo, appUrl);
    redirectUrl.searchParams.set("google_success", "1");
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("Google authentication error:", err);
    const redirectUrl = new URL(returnTo, appUrl);
    redirectUrl.searchParams.set("google_error", "auth_failed");
    return NextResponse.redirect(redirectUrl);
  }
}
