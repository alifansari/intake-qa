"use client";
import * as React from "react";
import { cn } from "@/lib/cn";

// Demo mode adds brief guided annotations for use on live sales calls. It's a
// subtle toggle (persisted to localStorage) — off by default so the product
// reads as a real tool, on when the founder is walking a partner through it.
const DemoContext = React.createContext<{
  demo: boolean;
  toggle: () => void;
}>({ demo: false, toggle: () => {} });

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [demo, setDemo] = React.useState(false);
  React.useEffect(() => {
    setDemo(localStorage.getItem("demo-mode") === "1");
  }, []);
  const toggle = React.useCallback(() => {
    setDemo((d) => {
      const next = !d;
      localStorage.setItem("demo-mode", next ? "1" : "0");
      return next;
    });
  }, []);
  return <DemoContext.Provider value={{ demo, toggle }}>{children}</DemoContext.Provider>;
}

export function useDemoMode() {
  return React.useContext(DemoContext);
}

export function DemoToggle({ className }: { className?: string }) {
  const { demo, toggle } = useDemoMode();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={demo}
      className={cn(
        "inline-flex items-center gap-2 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors no-print",
        demo
          ? "border-white/40 bg-white/15 text-white"
          : "border-white/25 text-white/70 hover:text-white",
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          demo ? "bg-white" : "bg-white/40",
        )}
      />
      Demo mode {demo ? "on" : "off"}
    </button>
  );
}

// An annotation that only appears in demo mode — a guided talking point.
export function Annotation({ children }: { children: React.ReactNode }) {
  const { demo } = useDemoMode();
  if (!demo) return null;
  return (
    <div className="no-print mb-3 flex gap-2 rounded-sm border border-navy/20 bg-navy-tint px-3 py-2 text-xs text-navy">
      <span className="font-semibold uppercase tracking-wide">Talk track</span>
      <span className="text-navy/90">{children}</span>
    </div>
  );
}
