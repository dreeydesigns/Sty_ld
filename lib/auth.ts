// lib/auth.ts
import bcrypt from 'bcryptjs';

// Use this when saving a new password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Use this when a user tries to log in
export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}