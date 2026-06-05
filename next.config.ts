import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-src 'self' https://w.soundcloud.com;",
          },
          {
            key: "Permissions-Policy",
            value: "encrypted-media=*",
          },
        ],
      },
    ]
  },
}

export default nextConfig