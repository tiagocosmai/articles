"use client";

import { createContext, useCallback, useContext, useId, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";

type SegmentSize = "sm" | "md" | "lg";
type TabsVariant = "primary" | "secondary";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
  idBase: string;
  variant: TabsVariant;
};

const TabsContext = createContext<TabsContextValue | null>(null);
const SegmentSizeContext = createContext<SegmentSize>("md");

function useTabsContext(component: string) {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`<${component}> must be used within <Tabs>`);
  return context;
}

function classes(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const primaryList = "mb-6 flex items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-white/20";
const primaryTrigger = "relative -mb-px inline-flex shrink-0 items-center justify-center border-b-2 font-bold";
const primarySize: Record<SegmentSize, string> = {
  sm: "px-2.5 py-1.5 text-sm",
  md: "px-3 py-2 text-sm",
  lg: "px-3.5 py-2.5 text-base",
};

const segmentTrack = "mb-4 inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-2xl border border-white/20 bg-white/5 p-0.5";
const segmentTrigger = "inline-flex shrink-0 items-center justify-center rounded-xl font-bold";
const segmentSize: Record<SegmentSize, string> = {
  sm: "h-8 px-2.5 text-sm",
  md: "h-10 px-3 text-sm",
  lg: "h-12 px-4 text-base",
};

export function Tabs({
  value: controlledValue,
  defaultValue,
  onValueChange,
  variant = "secondary",
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
  children: ReactNode;
}) {
  const isControlled = controlledValue !== undefined;
  const idBase = useId();
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const value = controlledValue ?? internalValue;
  const setValue = useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );
  const context = useMemo(() => ({ value, setValue, idBase, variant }), [value, setValue, idBase, variant]);
  return <TabsContext.Provider value={context}>{children}</TabsContext.Provider>;
}

export function TabsList({
  "aria-label": ariaLabel,
  size = "md",
  children,
}: {
  "aria-label": string;
  size?: SegmentSize;
  children: ReactNode;
}) {
  const { variant } = useTabsContext("TabsList");
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]:not(:disabled)'));
    if (tabs.length === 0) return;
    const current = tabs.indexOf(document.activeElement as HTMLElement);
    let next = current;
    if (event.key === "ArrowRight") next = current < 0 ? 0 : (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = current < 0 ? tabs.length - 1 : (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else next = tabs.length - 1;
    event.preventDefault();
    const target = tabs[next];
    target.focus();
    target.click();
  }

  return (
    <SegmentSizeContext.Provider value={size}>
      <div role="tablist" aria-label={ariaLabel} className={variant === "primary" ? primaryList : segmentTrack} onKeyDown={onKeyDown}>
        {children}
      </div>
    </SegmentSizeContext.Provider>
  );
}

export function TabsTrigger({
  value,
  href,
  children,
}: {
  value: string;
  href?: string;
  children: ReactNode;
}) {
  const { value: active, setValue, idBase, variant } = useTabsContext("TabsTrigger");
  const size = useContext(SegmentSizeContext);
  const selected = active === value;
  const className =
    variant === "primary"
      ? classes(primaryTrigger, primarySize[size], selected ? "border-brand text-white" : "border-transparent text-white/60 hover:text-white")
      : classes(segmentTrigger, segmentSize[size], selected ? "bg-white text-ink" : "text-white/70 hover:bg-white/10 hover:text-white");
  const shared = {
    role: "tab" as const,
    id: `${idBase}-tab-${value}`,
    "aria-selected": selected,
    "aria-controls": `${idBase}-panel-${value}`,
    tabIndex: selected ? 0 : -1,
    className,
    onClick: () => setValue(value),
  };
  if (href) {
    return (
      <a href={href} {...shared}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" {...shared}>
      {children}
    </button>
  );
}

export function TabsPanel({ value, children }: { value: string; children: ReactNode }) {
  const { value: active, idBase } = useTabsContext("TabsPanel");
  const selected = active === value;
  return (
    <div role="tabpanel" id={`${idBase}-panel-${value}`} aria-labelledby={`${idBase}-tab-${value}`} hidden={!selected}>
      {selected ? children : null}
    </div>
  );
}
