import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The old separate picks page was folded into /dashboard
  async redirects() {
    return [{ source: "/user-dashboard", destination: "/dashboard", permanent: false }];
  },
};

export default nextConfig;
