"use server";
import { redirect } from "next/navigation";

// Legacy email-only registration has no phone identity. Route it through the
// validated signup flow instead of writing an invalid user or a fake session.
export async function signUp(_formData: FormData): Promise<{ success: boolean; message: string }> {
  redirect("/auth/sign-up");
}
