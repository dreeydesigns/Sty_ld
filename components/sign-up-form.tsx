"use client";

import { useState } from "react";
import { signUp } from "@/app/auth/actions";



export default function SignUpForm() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await signUp(formData);
    if (result) {
      setMessage(result.message);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6 border rounded-xl shadow-sm max-w-sm w-full">
      <h2 className="text-2xl font-semibold">Sign Up</h2>
      
      <label htmlFor="email" className="text-sm font-medium">Email</label>
      <input 
        id="email"
        name="email" 
        type="email" 
        required 
        className="p-2 border rounded-md"
      />
      
      <label htmlFor="password" className="text-sm font-medium">Password</label>
      <input 
        id="password"
        name="password" 
        type="password" 
        required 
        className="p-2 border rounded-md"
      />
      
      <button 
        type="submit" 
        disabled={loading}
        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? "Creating..." : "Create Account"}
      </button>

      {message && <p className="text-sm text-center">{message}</p>}
    </form>
  );
}