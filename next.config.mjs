/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "ably"],
  },
};

export default nextConfig;
