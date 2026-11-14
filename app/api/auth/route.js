import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabasePool, pingDatabase } from "../../../lib/server/db";
import { sendPasswordResetEmail } from "../../../lib/server/email";
import { hashPassword, verifyPassword } from "../../../lib/server/passwords";
import { clearSession, createSession, getCurrentUser } from "../../../lib/server/session";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    user_metadata: { full_name: user.full_name, phone: user.phone },
  };
}

export async function GET() {
  try {
    const connected = await pingDatabase();
    return NextResponse.json({ configured: connected, user: connected ? await getCurrentUser() : null });
  } catch (error) {
    console.error("Could not check local account session:", error);
    return NextResponse.json({ configured: false, user: null, error: "Local MySQL is not ready. Run npm run db:setup." }, { status: 503 });
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Account details are invalid." }, { status: 400 });
  }

  const action = body.action;
  const pool = getDatabasePool();

  try {
    if (action === "logout") {
      await clearSession();
      return NextResponse.json({ user: null });
    }

    if (action === "profile") {
      const user = await getCurrentUser();
      if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      if (name.length < 1 || name.length > 120 || phone.length > 50 || (phone && phone.length < 7)) {
        return NextResponse.json({ error: "Enter a name and a valid phone number up to 50 characters." }, { status: 400 });
      }
      await pool.execute("UPDATE users SET full_name = ?, phone = ? WHERE id = ?", [name, phone, user.id]);
      return NextResponse.json({ user: { ...user, user_metadata: { full_name: name, phone } } });
    }

    if (action === "forgot_password") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!EMAIL.test(email)) {
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
      }
      const [rows] = await pool.execute("SELECT id, email, full_name FROM users WHERE email = ? LIMIT 1", [email]);
      if (rows.length) {
        const user = rows[0];
        const token = randomBytes(32).toString("hex");
        const tokenHash = createHash("sha256").update(token).digest("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await pool.execute(
          "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
          [user.id, tokenHash, expiresAt],
        );

        const appUrl = process.env.APP_URL || "http://localhost:3001";
        const resetUrl = `${appUrl}/account?reset_token=${token}`;

        sendPasswordResetEmail({
          email: user.email,
          customerName: user.full_name,
          resetUrl,
        }).catch((err) => console.error("Error sending reset email:", err.message));
      }

      return NextResponse.json({
        message: "If an account exists with that email, a password reset link has been dispatched.",
      });
    }

    if (action === "reset_password") {
      const token = typeof body.token === "string" ? body.token.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (!token || password.length < 8 || password.length > 128) {
        return NextResponse.json({ error: "Password must be between 8 and 128 characters." }, { status: 400 });
      }
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const [resets] = await pool.execute(
        "SELECT id, user_id FROM password_resets WHERE token_hash = ? AND used = FALSE AND expires_at > NOW() LIMIT 1",
        [tokenHash],
      );
      if (!resets.length) {
        return NextResponse.json({ error: "The password reset link is invalid or has expired." }, { status: 400 });
      }
      const reset = resets[0];
      const passwordHash = await hashPassword(password);
      await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, reset.user_id]);
      await pool.execute("UPDATE password_resets SET used = TRUE WHERE id = ?", [reset.id]);
      await createSession(reset.user_id);
      const [users] = await pool.execute("SELECT id, email, full_name, phone, role FROM users WHERE id = ? LIMIT 1", [reset.user_id]);
      return NextResponse.json({ user: publicUser(users[0]), message: "Your password has been reset successfully." });
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!EMAIL.test(email) || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: "Enter a valid email and a password between 8 and 128 characters." }, { status: 400 });
    }

    if (action === "signup") {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      if (name.length < 1 || name.length > 120 || phone.length < 7 || phone.length > 50) {
        return NextResponse.json({ error: "Enter your name and a valid phone number (7–50 characters)." }, { status: 400 });
      }
      const passwordHash = await hashPassword(password);
      const userId = randomUUID();
      try {
        await pool.execute(
          "INSERT INTO users (id, email, password_hash, full_name, phone, role) VALUES (?, ?, ?, ?, ?, 'customer')",
          [userId, email, passwordHash, name, phone],
        );
      } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
          return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
        }
        throw error;
      }
      await createSession(userId);
      return NextResponse.json({ user: { id: userId, email, role: "customer", user_metadata: { full_name: name, phone } } }, { status: 201 });
    }

    if (action === "login") {
      const [rows] = await pool.execute(
        "SELECT id, email, full_name, phone, role, password_hash FROM users WHERE email = ? LIMIT 1",
        [email],
      );
      const user = rows[0];
      if (!user || !(await verifyPassword(password, user.password_hash))) {
        return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
      }
      await createSession(user.id);
      return NextResponse.json({ user: publicUser(user) });
    }

    return NextResponse.json({ error: "Account action is invalid." }, { status: 400 });
  } catch (error) {
    console.error("Local account request failed:", error);
    return NextResponse.json({ error: "Account service is unavailable. Check the local MySQL setup." }, { status: 503 });
  }
}
