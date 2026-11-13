/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow image loading from avatars / external sources if needed
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

