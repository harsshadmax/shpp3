import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.output = {
        ...config.output,
        chunkLoadingGlobal: "webpackChunk_project96",
      };
    }
    return config;
  },
};

export default nextConfig;

