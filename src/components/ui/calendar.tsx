"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarProps {
  value?: Date;
  onChange?: (date: Date) => void;
  // Multi-sélection (optionnel) : plusieurs jours cochés. Si fourni, prime sur
  // value/onChange — un jour est sélectionné s'il est dans selectedDates, le clic
  // appelle onToggleDate. Rétro-compatible : le mono-select reste inchangé.
  selectedDates?: Date[];
  onToggleDate?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

const WEEKDAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function Calendar({
  value,
  onChange,
  selectedDates,
  onToggleDate,
  minDate,
  maxDate,
  className,
}: CalendarProps) {
  const multi = !!onToggleDate;
  const initial = value ?? selectedDates?.[0] ?? minDate ?? new Date();
  const [view, setView] = React.useState<Date>(firstOfMonth(initial));

  const min = minDate ? startOfDay(minDate) : undefined;
  const max = maxDate ? startOfDay(maxDate) : undefined;

  // Grille de 6 semaines, lundi en premier
  const monthStart = firstOfMonth(view);
  const offset = (monthStart.getDay() + 6) % 7; // 0 = lundi
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - offset);
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const isDisabled = (d: Date) => {
    const day = startOfDay(d);
    if (min && day < min) return true;
    if (max && day > max) return true;
    return false;
  };

  const prevDisabled = min ? firstOfMonth(view) <= firstOfMonth(min) : false;
  const nextDisabled = max ? firstOfMonth(view) >= firstOfMonth(max) : false;

  const monthLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(view);

  return (
    <div className={cn("w-64 select-none", className)}>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          disabled={prevDisabled}
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold capitalize text-foreground">
          {monthLabel}
        </span>
        <button
          type="button"
          disabled={nextDisabled}
          onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday header */}
      <div className="mb-1 grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center text-[10px] font-medium uppercase text-muted-foreground"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === view.getMonth();
          const disabled = isDisabled(d);
          const selected = multi
            ? (selectedDates ?? []).some((s) => sameDay(d, s))
            : value
              ? sameDay(d, value)
              : false;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() =>
                multi ? onToggleDate?.(startOfDay(d)) : onChange?.(startOfDay(d))
              }
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors",
                !inMonth && "text-muted-foreground/40",
                inMonth && !disabled && !selected && "text-foreground hover:bg-muted",
                selected && "bg-primary font-semibold text-white hover:bg-primary",
                disabled && "cursor-not-allowed text-muted-foreground/30 line-through"
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
