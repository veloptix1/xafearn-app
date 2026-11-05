export function generateStaticParams() {
  return [{ id: 'placeholder' }]
}

export default function SeriesEditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
