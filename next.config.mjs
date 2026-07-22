/** @type {import('next').NextConfig} */
const nextConfig={
  reactStrictMode:true,
  // Serve the self-contained Learn page (public/learn.html) at /learn.
  async rewrites(){return [{source:"/learn",destination:"/learn.html"}];},
};
export default nextConfig;
