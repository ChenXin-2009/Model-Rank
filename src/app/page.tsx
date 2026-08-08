import { getSnapshotDate, getTextDataset, getAllArenaData } from "@/lib/data"
import HomeClient, { type HomeData } from "@/components/HomeClient"
import { Header, Footer } from "@/components/Layout"

export default function HomePage() {
  const { models } = getTextDataset()
  const approxDate = getSnapshotDate()
  const arena = getAllArenaData()

  const data: HomeData = {
    models,
    arena,
    date: approxDate ?? "—",
  }

  return (
    <>
      <Header date={approxDate} />
      <HomeClient data={data} />
      <Footer />
    </>
  )
}