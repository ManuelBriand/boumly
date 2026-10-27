"use client";

import { ChefHat } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/shared/EmptyState";
import { aggregateProduction } from "@/lib/orders";
import type { Order } from "@/types";

interface ProductionSummaryProps {
  orders: Order[];
}

export function ProductionSummary({ orders }: ProductionSummaryProps) {
  const lines = aggregateProduction(orders);
  const t = useTranslations("production");

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<ChefHat className="h-7 w-7" />}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  const totalItems = lines.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <div className="rounded-2xl bg-white ring-1 ring-border overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{t("toProduce")}</p>
        <span className="text-xs text-muted-foreground">{t("itemCount", { count: totalItems })}</span>
      </div>
      <div className="divide-y divide-border">
        {lines.map((line) => (
          <div key={line.key} className="flex items-start gap-3 px-4 py-3">
            <span className="shrink-0 inline-flex items-center justify-center min-w-7 h-7 px-1.5 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              {line.quantity}×
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground leading-snug">{line.name}</p>
              {line.variantLabel && (
                <p className="text-xs text-muted-foreground">{line.variantLabel}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
