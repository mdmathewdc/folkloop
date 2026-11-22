import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@temporalio/client', '@temporalio/common', 'pg'],
};

export default nextConfig;
