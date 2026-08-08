import { CREATOR_LOGOS } from "@/lib/logos"

const GOLDEN = 0.618033988749895

function hueOf(slug: string): number {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0
  return Math.round((h % 1000) / 1000 * 360 * GOLDEN) % 360
}

/** 开发商 logo（无 logo 时回退为品牌首字母圆标） */
export default function CreatorLogo({ slug, size = 16 }: { slug?: string | null; size?: number }) {
  const info = slug ? CREATOR_LOGOS[slug] : undefined
  const name = info?.name ?? slug ?? "?"
  if (info) {
    return (
      <img
        src={info.file}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        className="creator-logo"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="creator-logo-fallback"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.55), background: `hsl(${hueOf(slug ?? "?")} 48% 40%)` }}
      aria-label={name}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
