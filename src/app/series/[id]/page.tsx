import SeriesDetailClient from './ClientPage'

export async function generateStaticParams() {
  return [{ id: 'default' }]
}

export default function SeriesDetailPage() {
  return <SeriesDetailClient />
}
