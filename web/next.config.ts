import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "192.0.0.2",
    "localhost",
    "172.20.10.7",
  ],
};

export default nextConfig;
