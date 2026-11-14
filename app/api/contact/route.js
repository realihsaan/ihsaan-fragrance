import { NextResponse } from "next/server";
import { sendContactEmail } from "../../../lib/server/email";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request format." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (name.length < 2 || name.length > 100) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }
  if (!EMAIL.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (message.length < 5 || message.length > 2000) {
    return NextResponse.json({ error: "Please enter a message between 5 and 2000 characters." }, { status: 400 });
  }

  try {
    await sendContactEmail({ name, email, message });
    return NextResponse.json({
      success: true,
      message: "Thank you for contacting Maison Ihsaan Ali. Our concierge will attend to your inquiry shortly.",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json({ error: "We could not deliver your message. Please reach us directly at care@ehsaanali.com" }, { status: 500 });
  }
}
