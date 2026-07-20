"use server";

import { sql } from "@vercel/postgres";
import { hashPassword } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, message: "Please provide both email and password." };
  }

  try {
    // 1. Hash the password before it touches the database
    const hashedPassword = await hashPassword(password);

    // 2. Insert user into the database
    await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${email}, ${hashedPassword})
    `;

    // 3. Set the session cookie so the middleware recognizes the user
    const cookieStore = await cookies();
    cookieStore.set("session", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    // 4. Redirect to dashboard
    redirect("/dashboard");

  } catch (error) {
    console.error("Sign-up error:", error);
    return { 
      success: false, 
      message: "Error creating account. Email might already be taken." 
    };
  }
}