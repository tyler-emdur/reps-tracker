/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow any external image domain (mulebuy CDN domains vary)
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http',  hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
