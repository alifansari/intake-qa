import * as React from "react";
import { cn } from "@/lib/cn";

export function PageShell({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto max-w-6xl px-4 py-6 sm:py-8", className)}
      {...props}
    />
  );
}

export function PageHeader({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-2 border-b border-line-strong pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker ? <div className="eyebrow mb-1">{kicker}</div> : null}
        <h1 className="font-display text-2xl font-bold leading-tight text-ink sm:text-[28px]">
          {title}
        </h1>
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function SectionTitle({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="eyebrow flex items-center gap-1.5">{children}</h2>
      {aside}
    </div>
  );
}
