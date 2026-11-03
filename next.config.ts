import type { NextConfig } from "next";

const config: NextConfig = {
  turbopack: { root: import.meta.dirname },
  // ponytail: dev cache off to keep disk use low on this machine
  experimental: { turbopackFileSystemCacheForDev: false },
};

export default config;
