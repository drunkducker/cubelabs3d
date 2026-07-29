/** @type {import('next').NextConfig} */
const nextConfig={
  reactStrictMode:true,
  async headers(){
    const csp=[
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "media-src 'self' blob: https:",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.stripe.com",
      "frame-src https://js.stripe.com",
      "upgrade-insecure-requests",
    ].join("; ");
    return [
      {
        source:"/:path*",
        headers:[
          {key:"Content-Security-Policy",value:csp},
          {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
          {key:"X-Content-Type-Options",value:"nosniff"},
          {key:"X-Frame-Options",value:"DENY"},
          {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=(), payment=()"},
          {key:"Cross-Origin-Opener-Policy",value:"same-origin-allow-popups"},
        ],
      },
    ];
  },
  // Keep the faithful standalone Learn rebuild reachable for visual comparison.
  async rewrites(){return [{source:"/learn/standalone",destination:"/learn.html"}];},
};
export default nextConfig;
