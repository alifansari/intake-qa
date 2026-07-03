"use client";
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/cn";

export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-xs rounded-sm bg-ink px-3 py-2 text-xs leading-relaxed text-white shadow-lg",
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

// Convenience wrapper: an info marker with a methodology note on hover/focus.
export function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={100}>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="How this is calculated"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-line-strong text-[10px] font-semibold text-muted hover:border-navy hover:text-navy"
          >
            i
          </button>
        </TooltipTrigger>
        <TooltipContent>{children}</TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
}
