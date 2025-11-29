import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 确保 Prisma 运行时模块能被正确解析
  serverExternalPackages: ['@prisma/client'],
  experimental: {
    // 确保 Turbopack 正确处理 node_modules 中的 ESM 模块
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

export default nextConfig;
