import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/tin/:path*", destination: "/", permanent: false },
      { source: "/taxid/:path*", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
