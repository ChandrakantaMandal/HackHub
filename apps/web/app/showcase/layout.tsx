import { ShowcaseShell } from "@/components/shell/showcase-shell"

export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ShowcaseShell>{children}</ShowcaseShell>
}
