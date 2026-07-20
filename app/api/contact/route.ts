import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as {
      name?: string; email?: string; phone?: string; subject?: string; message?: string;
    } | null;

    if (!body?.name?.trim() || !body?.message?.trim()) {
      return NextResponse.json({ ok: false, error: "Name and message are required." }, { status: 400 });
    }

    await sql`
      INSERT INTO contact_messages (name, email, phone, subject, message)
      VALUES (${body.name.trim()}, ${body.email?.trim() ?? null}, ${body.phone?.trim() ?? null},
              ${body.subject?.trim() ?? null}, ${body.message.trim()})
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/contact error:", error);
    return NextResponse.json({ ok: false, error: "Failed to send message." }, { status: 500 });
  }
}
