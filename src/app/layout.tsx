import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import BottomNav from '@/components/BottomNav'
import AndroidBackHandler from '@/components/AndroidBackHandler'
import NetworkStatus from '@/components/NetworkStatus'
import PushNotificationSetup from '@/components/PushNotificationSetup'
import DeepLinkHandler from '@/components/DeepLinkHandler'
import AlertToastHost from '@/components/AlertToastHost'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'XAFEARN - Gagne de l\'argent en ligne',
  description: 'La plateforme qui te permet de gagner de l\'argent en ligne.',
  manifest: '/manifest.webmanifest',
  applicationName: 'XAFEARN',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'XAFEARN', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0284c7',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-slate-50`}>
        <NetworkStatus />
        <AndroidBackHandler />
        <PushNotificationSetup />
        <DeepLinkHandler />
        <AlertToastHost />
        {children}
        <BottomNav />
      </body>
    </html>
  )
}
