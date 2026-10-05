import type { Metadata } from 'next'
import { DM_Serif_Display, Karla } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-dm-serif',
})

const karla = Karla({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-karla',
})

export const metadata: Metadata = {
  title: 'The Bake Off League',
  description: 'The Great British Bake Off Fantasy League - Pick your favorites and compete with friends!',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${dmSerif.variable} ${karla.variable}`}>
      <body className="font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
