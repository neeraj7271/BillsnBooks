/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@platform/ui', '@platform/shared-types'],
  reactStrictMode: true,
};

module.exports = nextConfig;

