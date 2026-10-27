"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { createStore } from "@/services/store.service";
import { STRIPE_COUNTRIES, DEFAULT_COUNTRY } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Formulaire de création de boutique réutilisable (nom + pays). `createStore`
// crée le doc boutique ET passe l'utilisateur en vendeur ; `refreshStore` recharge
// la boutique → `isSeller` devient vrai. Utilisé par l'écran d'onboarding vendeur
// (StoreSetup) et en inline dans l'inscription à un marché.
export function CreateStoreForm({
  onCreated,
  submitLabel,
  className,
}: {
  onCreated?: () => void;
  submitLabel?: string;
  className?: string;
}) {
  const { firebaseUser, refreshStore } = useAuth();
  const t = useTranslations("dashboard.setupStore");
  const tv = useTranslations("validation");
  const [name, setName] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseUser) return;
    if (name.trim().length < 2) {
      toast.error(tv("storeNameMin"));
      return;
    }
    setLoading(true);
    try {
      await createStore(firebaseUser.uid, name.trim(), country);
      await refreshStore();
      onCreated?.();
    } catch {
      toast.error(t("error"));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-5", className)}>
      <div className="space-y-1.5">
        <Label htmlFor="store-name">{t("label")}</Label>
        <Input
          id="store-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("placeholder")}
          className="h-11"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t("countryLabel")}</Label>
        <Select value={country} onValueChange={(v) => setCountry(v ?? DEFAULT_COUNTRY)}>
          <SelectTrigger className="h-11 rounded-xl">
            <SelectValue>
              {(val) => {
                const c = STRIPE_COUNTRIES.find((x) => x.code === val);
                return c ? `${c.flag} ${c.label}` : t("chooseCountry");
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STRIPE_COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.flag} {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t("countryHint")}</p>
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full rounded-xl text-base font-semibold"
      >
        {loading ? t("submitting") : (submitLabel ?? t("submit"))}
      </Button>
    </form>
  );
}
