import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badge = cva(
  "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium border tnum whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-canvas text-muted border-line",
        navy: "bg-navy-tint text-navy border-navy/20",
        red: "bg-red-tint text-red border-red/20",
        amber: "bg-amber-tint text-amber border-amber/25",
        green: "bg-green-tint text-green border-green/20",
        solidNavy: "bg-navy text-white border-navy",
        solidRed: "bg-red text-white border-red",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badge> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
