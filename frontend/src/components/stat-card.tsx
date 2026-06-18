import * as React from "react";

import { Card, CardContent } from "./ui/card";
import { cn } from "../lib/utils";
import { ArrowDownRight, ArrowUpRight, ArrowUpRight as LinkIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  hint,
  href,
}: {
  label: string;
  value: string;
  delta?: number;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
  href?: string;
}) {
  const positive = (delta ?? 0) >= 0;
  const inner = (
    <Card
      className={cn(
        "border bg-card transition-all",
        href && "hover:border-primary/50 hover:shadow-sm cursor-pointer group",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          </div>
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          {typeof delta === "number" && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
                positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta)}%
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
          {href && (
            <span className="ml-auto inline-flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              View <LinkIcon className="ml-0.5 h-3 w-3" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
  if (href) {
    return (
      <a href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
        {inner}
      </a>
    );
  }
  return inner;
}
