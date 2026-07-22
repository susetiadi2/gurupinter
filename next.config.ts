import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.100.184"],
  serverExternalPackages: ['html-to-docx'],
};

export default nextConfig;
