"use client";
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  className,
  children,
  title,
  ...props
}: React.ComponentProps<typeof Dialog.Content> & { title?: string }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
      <Dialog.Content
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-xl overflow-y-auto bg-paper shadow-xl border-l border-line focus:outline-none",
          className,
        )}
        {...props}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-line bg-paper px-5 py-3">
          <Dialog.Title className="font-display text-base font-semibold">
            {title}
          </Dialog.Title>
          <Dialog.Close className="text-muted hover:text-ink">
            <X className="h-4 w-4" />
          </Dialog.Close>
        </div>
        <Dialog.Description className="sr-only">Call detail</Dialog.Description>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
