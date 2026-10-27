"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Store as StoreIcon,
  Phone,
  Truck,
  Package,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { updateStore } from "@/services/store.service";
import type { Store, Product } from "@/types";

interface ChecklistItem {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  done: boolean;
}

export function OnboardingChecklist({
  store,
  products,
}: {
  store: Store;
  products: Product[];
}) {
  const { refreshStore } = useAuth();
  const t = useTranslations("onboarding");
  const [dismissing, setDismissing] = useState(false);

  const items: ChecklistItem[] = [
    {
      icon: StoreIcon,
      title: t("describeTitle"),
      description: t("describeDesc"),
      href: "/dashboard/settings",
      done: !!store.photoUrl && !!store.description?.trim(),
    },
    {
      icon: Phone,
      title: t("contactTitle"),
      description: t("contactDesc"),
      href: "/dashboard/settings?tab=contact",
      done: !!store.phone?.trim() || !!store.email?.trim(),
    },
    {
      icon: Truck,
      title: t("deliveryTitle"),
      description: t("deliveryDesc"),
      href: "/dashboard/settings?tab=reception",
      done: store.onboarding?.deliveryReviewed === true,
    },
    {
      icon: Package,
      title: t("productTitle"),
      description: t("productDesc"),
      href: "/dashboard/products/new",
      done: products.length > 0,
    },
    {
      icon: CreditCard,
      title: t("paymentsTitle"),
      description: t("paymentsDesc"),
      href: "/dashboard/settings?tab=paiements",
      done: store.stripeChargesEnabled === true,
    },
  ];

  if (store.onboarding?.dismissed) return null;

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;
  const progress = (doneCount / items.length) * 100;

  async function handleDismiss() {
    setDismissing(true);
    try {
      await updateStore(store.id, {
        onboarding: { ...store.onboarding, dismissed: true },
      });
      await refreshStore();
    } catch {
      setDismissing(false);
    }
  }

  // ── Bannière de succès (4/4) ───────────────────────────────────
  if (allDone) {
    return (
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-2xl">
          🎉
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{t("readyTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("readyDesc")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={dismissing}
          aria-label={t("close")}
          className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/60 hover:text-foreground disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  }

  // ── Checklist ───────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-border bg-white p-5 space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">{t("setupTitle")}</p>
            <p className="text-sm text-muted-foreground">
              {t("setupDesc")}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-primary">
            {doneCount}/{items.length}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ul className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.title}>
              <Link
                href={item.href}
                className={`flex items-center gap-4 rounded-2xl p-4 ring-1 transition-colors ${
                  item.done
                    ? "ring-border bg-muted/40"
                    : "ring-border bg-white hover:bg-muted/40"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    item.done ? "bg-muted" : "bg-primary/10"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      item.done ? "text-muted-foreground" : "text-primary"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      item.done
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                {item.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#22C55E]" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
