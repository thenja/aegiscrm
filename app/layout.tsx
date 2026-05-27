import type { Metadata } from "next"

import "./globals.css"

export const metadata: Metadata = {
  title: "Aegis Internal Portal",
  description: "Aegis Internal Portal",
  // TODO: place /public/favicon.ico for production branding.
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
