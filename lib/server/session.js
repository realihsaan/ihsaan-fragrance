import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getDatabasePool } from "./db";

const COOKIE_NAME = "ihsaan_session";
const SESSION_DAYS = 14;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getCurrentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) return null;

  const [rows] = await getDatabasePool().execute(
    `SELECT u.id, u.email, u.full_name, u.phone, u.role
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [hashToken(token)],
  );
  const user = rows[0];
  return user ? {
    id: user.id,
    email: user.email,
    role: user.role,
    user_metadata: { full_name: user.full_name, phone: user.phone },
  } : null;
}

export async function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await getDatabasePool().execute(
    "INSERT INTO user_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    [hashToken(token), userId, expiresAt],
  );
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token && /^[a-f0-9]{64}$/i.test(token)) {
    await getDatabasePool().execute("DELETE FROM user_sessions WHERE token_hash = ?", [hashToken(token)]);
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function authorizeAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in with an admin account.", status: 401 };
  if (user.role !== "admin") return { error: "This account does not have admin access.", status: 403 };
  return { user };
}
