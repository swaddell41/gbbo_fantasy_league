import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Older player pages were folded into /dashboard ("The Tent")
  async redirects() {
    return ["/user-dashboard", "/standings"].map(source => ({
      source,
      destination: "/dashboard",
      permanent: false,
    }));
  },
};

export default nextConfig;
