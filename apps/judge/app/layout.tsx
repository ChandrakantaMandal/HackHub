import "@workspace/ui/globals.css"
import { Toaster } from "@workspace/ui/components/sonner"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-100 antialiased">
        {children}
        <Toaster theme="dark" />
      </body>
    </html>
  )
}
