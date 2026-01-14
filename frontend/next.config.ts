import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // Transpile heroku-ai-provider for proper ESM handling
  transpilePackages: ["heroku-ai-provider"],
};

export default nextConfig;
