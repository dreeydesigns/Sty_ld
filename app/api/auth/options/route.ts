import { NextResponse } from 'next/server';
export function GET(){return NextResponse.json({email:true,google:process.env.GOOGLE_AUTH_VERIFIED === 'true' && !!(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET),phone:false});}
