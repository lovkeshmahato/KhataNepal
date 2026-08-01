import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@khatanepal/types"],
  eslint: {
    // Linting is run separately via `pnpm lint`; keep builds fast and
    // focused on type/runtime correctness.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
