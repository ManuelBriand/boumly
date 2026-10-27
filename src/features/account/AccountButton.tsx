"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

// Pilule d'accès à l'espace client, réutilisée sur les pages publiques (boutique,
// événement, inscription marché, confirmation/paiement). Redirige vers /account ;
// si déconnecté, mémorise la page courante via ?next= pour y revenir après login.
export function AccountButton({ className }: { className?: string }) {
  const pathname = usePathname();
  const { firebaseUser, user } = useAuth();
  const t = useTranslations("store");

  const accountHref = firebaseUser
    ? "/account"
    : `/account?next=${encodeURIComponent(pathname)}`;

  return (
    <Link
      href={accountHref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur border border-border px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-white transition-colors",
        className
      )}
    >
      <User className="h-3.5 w-3.5" />
      {firebaseUser ? (user?.name?.split(" ")[0] ?? t("myAccount")) : t("login")}
    </Link>
  );
}
