import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/tin/:path*", destination: "/", permanent: false },
      { source: "/taxid/:path*", destination: "/", permanent: false },
      { source: "/nin/modification/:path*", destination: "/dashboard", permanent: false },
      { source: "/nin/validation/:path*", destination: "/dashboard", permanent: false },
      { source: "/nin/ipe/:path*", destination: "/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
