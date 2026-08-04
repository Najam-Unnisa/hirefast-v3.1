import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: [
    '@hirefast/shared-types',
    '@hirefast/shared-utils',
    '@hirefast/shared-config',
  ],
};

export default nextConfig;
