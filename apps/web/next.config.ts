import type { NextConfig } from "next";
import path from "path";

const RENDER_API = process.env.RENDER_API_URL ?? "https://dcos.onrender.com";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@dcos/ui", "@dcos/types"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  // Proxy /api/v1/* through Vercel's edge → Render backend.
  // Browser never makes a cross-origin request → CORS is irrelevant.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${RENDER_API}/api/v1/:path*`,
      },
    ];
  },
};

export default config;
