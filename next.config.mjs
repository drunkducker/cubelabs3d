/** @type {import('next').NextConfig} */
const nextConfig={
  reactStrictMode:true,
  webpack(config){
    // The premium Skewb originally used a nearly full-size rounded cube as its
    // internal core. Alias that one geometry import to a compact mechanism so
    // the core cannot push through the turning surface pieces.
    config.resolve.alias["three/examples/jsm/geometries/RoundedBoxGeometry.js"]=
      new URL("./lib/skewb-core-geometry.ts",import.meta.url).pathname;
    return config;
  },
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
