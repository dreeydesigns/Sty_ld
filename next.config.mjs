const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://www.google.com https://www.gstatic.com https://www.recaptcha.net https://apis.google.com https://accounts.google.com https://vercel.live; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://vercel.live; img-src 'self' data: blob: https: https://img.clerk.com https://*.googleusercontent.com https://vercel.live https://vercel.com; font-src 'self' data: https://fonts.gstatic.com https://vercel.live https://assets.vercel.com; media-src 'self' blob: https:; connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://api.clerk.com https://clerk.accounts.dev https://clerk-telemetry.com https://*.clerk-telemetry.com https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.cloudinary.com https://accounts.google.com https://vercel.live https://*.pusher.com wss://*.pusher.com; frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://www.google.com https://www.recaptcha.net https://*.firebaseapp.com https://accounts.google.com https://vercel.live; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self';",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self)",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
