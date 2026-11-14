import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("return_to") || "/account";
  const clientId = process.env.GOOGLE_CLIENT_ID;

  const appUrl = process.env.APP_URL || new URL(request.url).origin;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  // If Google OAuth credentials are not yet configured in .env.local
  if (!clientId || clientId.trim() === "" || clientId.includes("your-google-client-id")) {
    const errorUrl = new URL("/account", appUrl);
    errorUrl.searchParams.set("google_error", "not_configured");
    return NextResponse.redirect(errorUrl);
  }

  // Generate a random state token for CSRF protection
  const state = randomBytes(24).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });

  cookieStore.set("google_oauth_return_to", returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(authUrl.toString());
}
