"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toISODate, parseISODate, formatRequestedDate } from "@/lib/scheduling";

interface DatePickerFieldProps {
  id?: string;
  value?: string; // ISO "yyyy-mm-dd"
  onChange: (iso: string) => void;
  min?: Date;
  max?: Date;
  placeholder?: string;
  ariaInvalid?: boolean;
}

export function DatePickerField({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = "Choisir une date",
  ariaInvalid,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? parseISODate(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={ariaInvalid}
            className={cn(
              "h-11 w-full justify-start gap-2 rounded-xl font-normal",
              !value && "text-muted-foreground"
            )}
          />
        }
      >
        <CalendarIcon className="h-4 w-4 shrink-0" />
        {value ? formatRequestedDate(value) : placeholder}
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          value={selected}
          minDate={min}
          maxDate={max}
          onChange={(d) => {
            onChange(toISODate(d));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
