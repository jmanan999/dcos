import type { NextConfig } from "next";
import path from "path";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@dcos/ui", "@dcos/types"],
  // Tell Next where the monorepo root is so it stops warning about multiple
  // lockfiles and traces output files correctly on Vercel.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default config;
