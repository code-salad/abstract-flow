import { resolve } from "node:path";
import type { NextConfig } from "next";

const DIST_DIR = process.env.NEXT_DIST_DIR ?? ".next";

const nextConfig: NextConfig = {
  distDir: DIST_DIR,
  turbopack: { root: resolve(process.cwd(), "..") },
  transpilePackages: ["abstract-flow"],
};

export default nextConfig;
