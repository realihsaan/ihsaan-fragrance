import { NextResponse } from "next/server";
import { getDatabasePool } from "../../../lib/server/db";

export const runtime = "nodejs";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const [result] = await getDatabasePool().execute(
      "INSERT IGNORE INTO newsletter_subscribers (email) VALUES (?)",
      [email],
    );
    return NextResponse.json({ subscribed: true, existing: result.affectedRows === 0 });
  } catch (error) {
    console.error("Could not save newsletter subscription:", error);
    return NextResponse.json({ error: "Newsletter signup could not be saved. Check the local MySQL setup." }, { status: 503 });
  }
}
