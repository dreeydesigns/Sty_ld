import { NextResponse } from 'next/server';
import { AuthError } from './auth-resolver';
export function sameOrigin(request: Request) {
  const origin=request.headers.get('origin');
  const expected=process.env.BETTER_AUTH_URL || new URL(request.url).origin;
  if (!origin || origin!==new URL(expected).origin) throw new AuthError('Invalid request origin.',403);
}
export function authError(error:unknown) {
  if(error instanceof AuthError)return NextResponse.json({error:error.message},{status:error.statusCode});
  console.error('Security operation failed');
  return NextResponse.json({error:'Unable to complete this request.'},{status:500});
}
