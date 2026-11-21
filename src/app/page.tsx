import { getSnapshotMeta, getTextDataset, getAllArenaData } from "@/lib/data"
import { getExchangeInfo } from "@/lib/exchange"
import HomeClient, { type HomeData } from "@/components/HomeClient"
import { Header, Footer } from "@/components/Layout"

export default function HomePage() {
  const { models } = getTextDataset()
  const meta = getSnapshotMeta()
  const arena = getAllArenaData()
  const exchange = getExchangeInfo()

  const data: HomeData = {
    models,
    arena,
    date: meta?.date ?? "—",
    sources: meta?.sources ?? {},
    rate: exchange.rate,
  }

  return (
    <>
      <Header date={meta?.date ?? null} />
      <HomeClient data={data} />
      <Footer exchange={exchange} />
    </>
  )
}