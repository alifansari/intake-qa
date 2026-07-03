"use client";
import { Printer } from "lucide-react";
import { Button } from "./ui/button";

export function PrintButton({ label = "Print / PDF" }: { label?: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
      <Printer className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
