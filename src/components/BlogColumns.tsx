import type { ReactNode } from "react";

export function BlogColumns({
  content,
  filters,
}: {
  content: ReactNode;
  filters: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-12">
      <div className="order-2 md:order-1 md:col-span-9">{content}</div>
      <aside className="order-1 md:order-2 md:col-span-3 md:sticky md:top-4">
        {filters}
      </aside>
    </div>
  );
}
