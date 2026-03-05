/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@aws/core'],
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
};

export default nextConfig;
