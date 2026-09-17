import { NextResponse } from 'next/server';
export async function POST() {
 return NextResponse.json({ ok: false, message: 'Verify your number on WhatsApp to create an account.', error: 'Verify your number on WhatsApp to create an account.' }, { status: 410 });
}
