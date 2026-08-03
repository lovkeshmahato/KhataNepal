import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  eslint: {
    // Linting is run separately via `npm run lint`; keep builds fast and
    // focused on type/runtime correctness.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
