/**
 * lib/phone-utils.ts
 * Phone number parsing and validation utilities.
 * Handles auto-fill, paste, and typing in any international format.
 */

export interface CountryConfig {
  code: string;    // digits only, e.g. "254"
  digits: number;  // expected local subscriber digit count
  prefix: string;  // "+254"
  flag: string;
  name: string;
}

// Sorted longest-code-first so "+1" never matches before "+234" or "+254"
export const COUNTRY_CODES: CountryConfig[] = [
  { code: "254", digits: 9,  prefix: "+254", flag: "🇰🇪", name: "Kenya"        },
  { code: "255", digits: 9,  prefix: "+255", flag: "🇹🇿", name: "Tanzania"     },
  { code: "256", digits: 9,  prefix: "+256", flag: "🇺🇬", name: "Uganda"       },
  { code: "250", digits: 9,  prefix: "+250", flag: "🇷🇼", name: "Rwanda"       },
  { code: "251", digits: 9,  prefix: "+251", flag: "🇪🇹", name: "Ethiopia"     },
  { code: "233", digits: 9,  prefix: "+233", flag: "🇬🇭", name: "Ghana"        },
  { code: "234", digits: 10, prefix: "+234", flag: "🇳🇬", name: "Nigeria"      },
  { code: "212", digits: 9,  prefix: "+212", flag: "🇲🇦", name: "Morocco"      },
  { code: "27",  digits: 9,  prefix: "+27",  flag: "🇿🇦", name: "South Africa" },
  { code: "20",  digits: 10, prefix: "+20",  flag: "🇪🇬", name: "Egypt"        },
  { code: "44",  digits: 10, prefix: "+44",  flag: "🇬🇧", name: "UK"           },
  { code: "91",  digits: 10, prefix: "+91",  flag: "🇮🇳", name: "India"        },
  { code: "1",   digits: 10, prefix: "+1",   flag: "🇺🇸", name: "USA / Canada" },
];

// Pre-sorted for matching (longest code first)
const SORTED = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);

const KENYA = COUNTRY_CODES.find((c) => c.code === "254")!;

export interface ParsedPhone {
  country: CountryConfig;
  localNumber: string;   // digits only, no prefix
  fullE164: string;      // e.g. "+254743817931"
  isValid: boolean;
}

/**
 * Parse any phone string into a structured result.
 *
 * Handles:
 *   +254743817931   (international with +)
 *   254743817931    (international without +)
 *   0743817931      (local with leading 0, assumes Kenya)
 *   743817931       (bare local digits, assumes Kenya)
 */
export function parsePhoneNumber(raw: string): ParsedPhone {
  // Strip formatting chars (spaces, dashes, parens, dots) but keep +
  const cleaned = raw.trim().replace(/[\s\-\(\)\.]/g, "");

  // Case 1: starts with +
  if (cleaned.startsWith("+")) {
    const afterPlus = cleaned.slice(1).replace(/\D/g, "");
    for (const c of SORTED) {
      if (afterPlus.startsWith(c.code)) {
        const local = afterPlus.slice(c.code.length);
        return {
          country: c,
          localNumber: local,
          fullE164: `+${c.code}${local}`,
          isValid: local.length === c.digits,
        };
      }
    }
  }

  // Case 2: all digits — try matching country code by length
  const digits = cleaned.replace(/\D/g, "");
  for (const c of SORTED) {
    if (digits.startsWith(c.code) && digits.length === c.code.length + c.digits) {
      const local = digits.slice(c.code.length);
      return { country: c, localNumber: local, fullE164: `+${c.code}${local}`, isValid: true };
    }
  }

  // Case 3: starts with 0 (local format, assume Kenya)
  if (digits.startsWith("0")) {
    const local = digits.slice(1);
    return {
      country: KENYA,
      localNumber: local,
      fullE164: `+254${local}`,
      isValid: local.length === KENYA.digits,
    };
  }

  // Case 4: bare local digits, assume Kenya
  return {
    country: KENYA,
    localNumber: digits,
    fullE164: `+254${digits}`,
    isValid: digits.length === KENYA.digits,
  };
}

/** Return true if the string is a valid E.164 number for any supported country. */
export function isValidE164(phone: string): boolean {
  if (!phone.startsWith("+")) return false;
  return parsePhoneNumber(phone).isValid;
}

/**
 * Validate an E.164 phone number broadly (10-15 digits after +).
 * Used by API routes to accept any international number.
 */
export function isValidE164Broad(phone: unknown): phone is string {
  return typeof phone === "string" && /^\+\d{7,15}$/.test(phone.replace(/\s/g, ""));
}
