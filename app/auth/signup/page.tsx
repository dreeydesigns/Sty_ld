'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  
  const [step, setStep] = useState<1 | 3>(1);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form fields for Step 3 (Profile Setup)
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // State Persistence: Load progress on mount
  useEffect(() => {
    Promise.resolve().then(() => {
      if (typeof window !== "undefined") {
        try {
          const savedStep = localStorage.getItem('styld_signup_step');
          const savedPhone = localStorage.getItem('styld_signup_phone');
          const savedFirstName = localStorage.getItem('styld_signup_firstName');
          
          if (savedStep === '1' || savedStep === '3') {
            setStep(Number(savedStep) as 1 | 3);
            console.log(`[Signup State] Restored step ${savedStep} from localStorage.`);
          }
          if (savedPhone) {
            setPhone(savedPhone);
            console.log(`[Signup State] Restored phone ${savedPhone} from localStorage.`);
          }
          if (savedFirstName) {
            setFirstName(savedFirstName);
            console.log(`[Signup State] Restored firstName ${savedFirstName} from localStorage.`);
          }
        } catch (err) {
          console.error('[Signup State] Failed to load saved progress:', err);
        }
      }
    });
  }, []);

  // State Persistence: Save progress on changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (step === 1) {
          localStorage.setItem('styld_signup_step', String(step));
          localStorage.setItem('styld_signup_phone', phone);
          localStorage.setItem('styld_signup_firstName', firstName);
        } else {
          // Clear when heading to step 3 (profile completion) or success
          localStorage.removeItem('styld_signup_step');
          localStorage.removeItem('styld_signup_phone');
          localStorage.removeItem('styld_signup_firstName');
          localStorage.removeItem('styld_signup_fallbackMode');
        }
      } catch (err) {
        console.error('[Signup State] Failed to save progress:', err);
      }
    }
  }, [step, phone, firstName]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      setPhone('');
      return;
    }

    // Remove non-digits
    let digits = val.replace(/\D/g, '');

    // Only apply +254 logic if typing or has substantial length
    if (digits.startsWith('0')) {
      digits = '254' + digits.slice(1);
    } else if (digits.length > 0 && !digits.startsWith('254')) {
      if (digits !== '25' && digits !== '2') {
        digits = '254' + digits;
      }
    }

    digits = digits.slice(0, 12);
    setPhone('+' + digits);
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Explicit validation for phone length
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 12) {
      console.warn(`[Validation Warning] Attempted to submit formatted number with less than 12 digits: ${phone} (digits: ${digitsOnly.length})`);
      setError("Please enter a complete phone number. Must contain at least 12 digits total after formatting (e.g., +2547XXXXXXXX).");
      return;
    }

    setStep(3);
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/client/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          phone,
          password,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        router.push('/dashboard');
      } else {
        setError(data.message || 'Failed to complete signup.');
      }
    } catch (err) {
      const errorObj = err as { message?: string };
      setError('Error setting up password: ' + (errorObj.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

      {step === 1 ? (
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone Number</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={handlePhoneChange} 
              placeholder="+254XXXXXXXXX" 
              required 
              className="w-full border p-2 text-black rounded focus:outline-none focus:ring-2 focus:ring-black"
            />
            {phone && phone.replace(/\D/g, '').length < 12 && (
              <p className="text-amber-600 text-xs mt-1">
                ⚠️ Phone number is too short. Must contain exactly 12 digits after formatting (entered: {phone.replace(/\D/g, '').length}/12).
              </p>
            )}
          </div>
          <button 
            type="submit" 
            disabled={phone.replace(/\D/g, '').length < 12} 
            className="w-full bg-black text-white py-2 rounded font-medium disabled:opacity-50 hover:bg-gray-800 transition-colors flex items-center justify-center"
          >
            Next: Create Profile
          </button>
        </form>
      ) : (
        <form onSubmit={handlePasswordSetup} className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Create Password</h2>
          <p className="text-xs text-gray-500 mb-4">Set up your account credentials for secure future login.</p>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">First Name</label>
            <input 
              type="text" 
              value={firstName} 
              onChange={(e) => setFirstName(e.target.value)} 
              placeholder="First Name" 
              required 
              className="w-full border p-2 text-black rounded focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password (Min 6 characters)</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Password" 
              required 
              className="w-full border p-2 text-black rounded focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Confirm Password</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              placeholder="Confirm Password" 
              required 
              className="w-full border p-2 text-black rounded focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !firstName.trim() || password.length < 6 || password !== confirmPassword} 
            className="w-full bg-black text-white py-2 rounded font-medium disabled:opacity-50 hover:bg-gray-800 transition-colors flex items-center justify-center"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating Account...
              </span>
            ) : (
              'Create Account & Finish'
            )}
          </button>
        </form>
      )}
    </div>
  );
}
