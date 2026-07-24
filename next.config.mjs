/** @type {import('next').NextConfig} */

/*
 * Security headers applied to every response.
 *
 * The Content-Security-Policy is shipped in REPORT-ONLY mode first: it does not
 * block anything yet, so it cannot break the Three.js hero, Tailwind, or the
 * admin UI, but violations are reported so the policy can be tightened to
 * enforcing later. The other headers are safe to enforce immediately and close
 * common classes of attack (clickjacking, MIME sniffing, referrer leakage,
 * feature abuse) with no functional cost.
 *
 * connect-src includes the Supabase origin so the app can reach Auth/REST.
 */
const SUPABASE_ORIGIN = (
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fvcjufbyjkjyorrmpgrm.supabase.co"
).replace(/\/$/, "");

const cspReportOnly = [
  "default-src 'self'",
  // Next.js injects a small amount of inline bootstrap script; keep unsafe-inline
  // only while in report-only so we can measure before moving to a nonce.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${SUPABASE_ORIGIN} https://api.stripe.com`,
  "font-src 'self' data:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // do not advertise the framework/version
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
