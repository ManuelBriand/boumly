"use client";

import Image from "next/image";
import { MapPin, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SOCIAL_PLATFORMS, buildSocialUrl } from "@/components/shared/socials";
import { AccountButton } from "@/features/account/AccountButton";
import type { Store } from "@/types";

// Sous-ensemble sérialisable des champs affichés — permet de passer un objet
// boutique construit côté serveur (Admin SDK) sans traîner le Timestamp createdAt.
export type StoreHeaderData = Pick<
  Store,
  "name" | "description" | "photoUrl" | "address" | "city" | "email" | "socials"
>;

interface StoreHeaderProps {
  store: StoreHeaderData;
  /** Si fourni, le bloc identité (photo + nom + description) devient un lien vers `href`. */
  href?: string;
}

export function StoreHeader({ store, href }: StoreHeaderProps) {
  const t = useTranslations("store");
  const socialLinks = SOCIAL_PLATFORMS.map((p) => ({
    ...p,
    url: buildSocialUrl(p.key, store.socials?.[p.key]),
  })).filter((p) => p.url);

  const identity = (
    <>
      {store.photoUrl ? (
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl shadow-md ring-4 ring-white">
          <Image src={store.photoUrl} alt={store.name} fill className="object-cover" />
        </div>
      ) : (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-4xl font-bold text-primary ring-4 ring-white shadow-md">
          {store.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-foreground">{store.name}</h1>
        {store.description && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {store.description}
          </p>
        )}
        {(store.address ?? store.city) && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{store.address ?? store.city}</span>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="relative border-b border-border bg-gradient-to-b from-primary/5 to-white">
      {/* Account button */}
      <AccountButton className="absolute top-4 right-4" />

      <div className="mx-auto max-w-2xl px-4 py-10">
        {href ? (
          <Link
            href={href}
            aria-label={t("backToStore")}
            className="flex items-center gap-5 transition-opacity hover:opacity-80"
          >
            {identity}
          </Link>
        ) : (
          <div className="flex items-center gap-5">{identity}</div>
        )}
        {(socialLinks.length > 0 || store.email) && (
              <div className="mt-3 flex items-center gap-2">
                {store.email && (
                  <a
                    href={`mailto:${store.email}`}
                    aria-label="Email"
                    title={store.email}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-border text-foreground shadow-sm transition-colors hover:bg-primary hover:text-white hover:border-primary"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                )}
                {socialLinks.map(({ key, label, url, icon: Icon }) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-border text-foreground shadow-sm transition-colors hover:bg-primary hover:text-white hover:border-primary"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
          </div>
        )}
      </div>
    </div>
  );
}
