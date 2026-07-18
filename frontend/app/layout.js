import "./globals.css"

export const metadata = {
  title: "HoloKai – Where Civilization Remembers",
  description: "Multi-agent AI system for preserving and explaining 5,000+ years of African civilizations, cultures, sciences, philosophies, and innovations",
  icons: {
    icon: "/Holokai-favicon.ico",
    shortcut: "/Holokai-favicon.ico",
    apple: "/Holokai-favicon.ico",
  },
  openGraph: {
    title: "HoloKai – Where Civilization Remembers",
    description: "Multi-agent AI system for African civilizations, cultures, sciences, philosophies, and innovations",
    type: "website",
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-black">{children}</body>
    </html>
  )
}
