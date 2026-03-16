import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/vscode-oniguruma/**/*",
      "./node_modules/.pnpm/vscode-oniguruma@*/node_modules/vscode-oniguruma/**/*",
    ],
  },
};

export default nextConfig;
