/** @type {import('next').NextConfig} */
const nextConfig = {
  // No .eslintrc is checked in for this scaffold, and `next build` runs
  // lint by default — in a non-interactive CI environment (Netlify's
  // build container) that combination fails the build outright. Turn it
  // off here rather than committing a lint config nobody asked for.
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
