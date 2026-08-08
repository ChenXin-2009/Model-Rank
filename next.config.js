/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  webpack: (config) => { config.cache = false; return config },
  // 本地生产构建与 dev 使用不同目录，避免 npm run build 覆写 dev 的 .next 导致 chunk 404；
  // CI/部署平台（Vercel 等）走标准 .next，保证能找到 routes-manifest.json
  distDir: process.env.CI || process.env.VERCEL ? ".next" : ".next-build",
}
module.exports = nextConfig