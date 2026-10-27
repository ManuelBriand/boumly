"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toISODate, parseISODate } from "@/lib/scheduling";

interface OrdersCalendarProps {
  countsByDate: Record<string, number>;
  selected: string | null;
  onSelect: (iso: string) => void;
  className?: string;
}

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function OrdersCalendar({
  countsByDate,
  selected,
  onSelect,
  className,
}: OrdersCalendarProps) {
  const locale = useLocale();
  const t = useTranslations("calendar");
  const intlLocale = locale === "en" ? "en-US" : "fr-FR";
  const initial = selected ? parseISODate(selected) : new Date();
  const [view, setView] = React.useState<Date>(firstOfMonth(initial));

  const todayISO = toISODate(new Date());

  // Jours de semaine (lundi en premier) localisés.
  const weekdayFmt = new Intl.DateTimeFormat(intlLocale, { weekday: "short" });
  const WEEKDAYS = Array.from({ length: 7 }, (_, i) => {
    // 2024-01-01 est un lundi.
    const d = new Date(2024, 0, 1 + i);
    return weekdayFmt.format(d);
  });

  // Grille 6 semaines, lundi en premier
  const monthStart = firstOfMonth(view);
  const offset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - offset);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const monthLabel = new Intl.DateTimeFormat(intlLocale, {
    month: "long",
    year: "numeric",
  }).format(view);

  return (
    <div className={cn("rounded-2xl bg-white p-4 ring-1 ring-border", className)}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          aria-label={t("prevMonth")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold capitalize text-foreground">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
          aria-label={t("nextMonth")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="mb-1 grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[10px] font-medium uppercase text-muted-foreground">
            {w}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const iso = toISODate(d);
          const inMonth = d.getMonth() === view.getMonth();
          const count = countsByDate[iso] ?? 0;
          const isSelected = selected === iso;
          const isToday = iso === todayISO;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(iso)}
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition-colors",
                !inMonth && "text-muted-foreground/40",
                inMonth && "text-foreground hover:bg-muted",
                isSelected && "bg-primary text-white hover:bg-primary",
                !isSelected && isToday && "ring-1 ring-primary/40"
              )}
            >
              <span className={cn(isToday && !isSelected && "font-bold text-primary")}>
                {d.getDate()}
              </span>
              {count > 0 && (
                <span
                  className={cn(
                    "mt-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                    isSelected ? "bg-white/25 text-white" : "bg-primary/15 text-primary"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
