import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@superdoc-dev/react", "superdoc", "docx"],
};

export default nextConfig;
