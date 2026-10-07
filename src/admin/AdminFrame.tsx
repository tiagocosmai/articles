import type { ReactNode } from "react";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "./ui/Tabs";

const sections = [
  { value: "report", href: "/admin", label: "Relatório" },
  { value: "comments", href: "/admin/comentarios", label: "Comentários" },
  { value: "posts", href: "/admin/posts", label: "Posts" },
] as const;

export function AdminFrame({ view, children }: { view: "report" | "comments" | "posts"; children: ReactNode }) {
  return (
    <main className="admin-panel min-h-full bg-surface-dark px-4 py-6 text-white [color-scheme:dark]">
      <Tabs value={view} variant="primary">
        <TabsList aria-label="Administração">
          {sections.map((section) => (
            <TabsTrigger key={section.value} value={section.value} href={section.href}>
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsPanel value={view}>{children}</TabsPanel>
      </Tabs>
    </main>
  );
}
