import { NextResponse } from 'next/server';
function retired(){return NextResponse.json({error:'Use unified email sign-in at /auth/sign-in.',retired:true},{status:410});}
export const GET=retired; export const POST=retired; export const DELETE=retired;
