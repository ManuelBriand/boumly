"use client";

import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Store,
  TentTree,
  Ticket,
  CalendarClock,
  Wallet,
  LogOut,
  ExternalLink,
  Share2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { signOut } from "@/services/auth.service";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { StoreShareDialog } from "@/features/store/StoreShareDialog";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

// Ordre par flux de travail : offre → ventes → argent → réglages.
// `seller: true` = item réservé au rôle vendeur (filtré ci-dessous).
const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/dashboard/products", icon: Package, key: "products", seller: true },
  { href: "/dashboard/ateliers", icon: CalendarClock, key: "ateliers" },
  { href: "/dashboard/events", icon: TentTree, key: "events" },
  { href: "/dashboard/orders", icon: ShoppingBag, key: "orders", seller: true },
  { href: "/dashboard/clients", icon: Users, key: "clients", seller: true },
  { href: "/dashboard/promos", icon: Ticket, key: "promos", seller: true },
  { href: "/dashboard/payments", icon: Wallet, key: "payments" },
  { href: "/dashboard/settings", icon: Store, key: "store", seller: true },
] as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { store, isSeller } = useAuth();
  const t = useTranslations("nav");
  const tc = useTranslations("common");

  // Nav dynamique : items vendeur si vendeur. "Marchés" toujours visible —
  // sert aussi de point d'entrée à l'activation du rôle organisateur.
  const navItems = NAV_ITEMS.filter(
    (i) => !("seller" in i && i.seller) || isSeller,
  );

  async function handleLogout() {
    onNavigate?.();
    try {
      await signOut();
      router.push("/login");
    } catch {
      toast.error(tc("logoutError"));
    }
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white">
          B
        </div>
        <span className="text-lg font-bold text-foreground">Boumly</span>
      </div>

      {/* Store card */}
      {store && (
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-border">
              {store.photoUrl ? (
                <Image
                  src={store.photoUrl}
                  alt={store.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-lg">
                  🛍️
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {store.name}
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                /store/{store.slug}
              </p>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <Link
              href={`/store/${store.slug}`}
              target="_blank"
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-white text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {tc("view")}
            </Link>
            <StoreShareDialog
              store={store}
              trigger={
                <button
                  type="button"
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-medium text-white transition-colors hover:bg-primary/90"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {tc("share")}
                </button>
              }
            />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-4 py-4">
        {navItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="space-y-2 border-t border-border px-4 py-4">
        <LanguageSwitcher />
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {tc("logout")}
        </button>
      </div>
    </aside>
  );
}
