export function generateStaticParams() {
  return [{ id: 'placeholder' }]
}

export default function SeriesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
