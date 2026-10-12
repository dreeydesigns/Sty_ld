import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-resolver';
import { authError } from '@/lib/api-security';
export async function GET(){try{await requireAdmin();return NextResponse.json({integrations:[
 {service:'Better Auth',configured:!!process.env.BETTER_AUTH_SECRET},
 {service:'Resend email',configured:!!process.env.RESEND_API_KEY},
 {service:'Google',configured:!!(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET)},
 {service:'Phone / WhatsApp',configured:false,details:'Disabled for no-billing MVP'}]});}catch(e){return authError(e);}}
