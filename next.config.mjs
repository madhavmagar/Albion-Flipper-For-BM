/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "render.albiononline.com",
      },
    ],
  },
};

export default nextConfig;
