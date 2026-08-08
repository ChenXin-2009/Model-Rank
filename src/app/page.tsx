import { getSnapshotDate, getTextDataset, getAllArenaData } from "@/lib/data"
import { getExchangeInfo } from "@/lib/exchange"
import HomeClient, { type HomeData } from "@/components/HomeClient"
import { Header, Footer } from "@/components/Layout"

export default function HomePage() {
  const { models } = getTextDataset()
  const approxDate = getSnapshotDate()
  const arena = getAllArenaData()
  const exchange = getExchangeInfo()

  const data: HomeData = {
    models,
    arena,
    date: approxDate ?? "—",
    rate: exchange.rate,
  }

  return (
    <>
      <Header date={approxDate} />
      <HomeClient data={data} />
      <Footer exchange={exchange} />
    </>
  )
}