/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  webpack: (config) => { config.cache = false; return config },
  // 生产构建与 dev 使用不同目录，避免 npm run build 覆写 dev 的 .next 导致 chunk 404 / MODULE_NOT_FOUND
  distDir: process.env.NODE_ENV === "production" ? ".next-build" : ".next",
}
module.exports = nextConfig