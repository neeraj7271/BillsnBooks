/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@platform/ui', '@platform/shared-types'],
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/practice/reviews',
        destination: '/practice/jobs?tab=review',
        permanent: false,
      },
      {
        source: '/practice/tasks',
        destination: '/practice/jobs?tab=tasks',
        permanent: false,
      },
      {
        source: '/practice/workload',
        destination: '/practice/capacity',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;

