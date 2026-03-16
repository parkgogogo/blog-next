import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./src/lib/vendor/onig.wasm"],
  },
};

export default nextConfig;
