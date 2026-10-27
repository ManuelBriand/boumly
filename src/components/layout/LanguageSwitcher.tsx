"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function switchTo(nextLocale: Locale) {
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- pathname + params are valid for the current route
        { pathname, params },
        { locale: nextLocale }
      );
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-xl border border-border bg-white p-1",
        className
      )}
    >
      <Languages className="ml-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          disabled={isPending}
          onClick={() => switchTo(l)}
          className={cn(
            "flex-1 rounded-lg px-2 py-1 text-xs font-semibold uppercase transition-colors disabled:opacity-60",
            l === locale
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
