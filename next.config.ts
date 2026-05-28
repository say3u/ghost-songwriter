import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Stop MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Limit referrer leakage
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions: mic allowed (VoiceInput), everything else off
          {
            key: "Permissions-Policy",
            value: "microphone=(self), camera=(), geolocation=(), payment=()",
          },
          // Force HTTPS for 1 year once set
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
