import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./src/lib/vendor/onig.wasm", "./src/content/**/*"],
  },
  async redirects() {
    return [{ source: "/blog", destination: "/", permanent: true }];
  },
};

export default nextConfig;
