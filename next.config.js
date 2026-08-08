/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  webpack: (config) => { config.cache = false; return config },
  // dev 永远用 .next；CI/部署平台（Vercel 等）构建用标准 .next（需要 routes-manifest.json）；
  // 仅本地生产构建（npm run build）隔离到 .next-build，避免覆写 dev 的 .next 导致 chunk 404
  distDir:
    process.env.NODE_ENV === "development" || process.env.CI || process.env.VERCEL
      ? ".next"
      : ".next-build",
}
module.exports = nextConfig