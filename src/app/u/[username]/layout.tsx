export function generateStaticParams() {
  return [{ username: 'placeholder' }]
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
