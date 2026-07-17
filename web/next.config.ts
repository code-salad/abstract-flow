import { resolve } from "node:path";
import type { NextConfig } from "next";

const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:3000";
const DIST_DIR = process.env.NEXT_DIST_DIR ?? ".next";

// /api is a proxy-only prefix: stripped and forwarded to the backend's real
// /v1 routes, so browser calls stay same-origin (no CORS anywhere).
const nextConfig: NextConfig = {
  distDir: DIST_DIR,
  turbopack: { root: resolve(process.cwd(), "..") },
  transpilePackages: ["abstract-flow"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/:path*` }];
  },
};

export default nextConfig;
