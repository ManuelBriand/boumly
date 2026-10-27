"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Store, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createStore } from "@/services/store.service";
import { STRIPE_COUNTRIES, DEFAULT_COUNTRY } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// CTA espace client : ouvrir une boutique (devenir vendeur). createStore bascule
// le rôle en "seller" et crée le doc boutique → redirection dashboard.
export function CreateStoreCard() {
  const { firebaseUser, refreshAuth } = useAuth();
  const router = useRouter();
  const t = useTranslations("account");
  const ts = useTranslations("dashboard.setupStore");
  const tv = useTranslations("validation");
  const [open, setOpen] = useState(false);
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
      await refreshAuth();
      router.push("/dashboard");
    } catch {
      toast.error(ts("error"));
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-border bg-white p-4 text-left transition-shadow hover:shadow-sm"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Store className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{t("openStoreTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("openStoreSub")}</p>
        </div>
        <Plus className="h-5 w-5 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ts("title")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-store-name">{ts("label")}</Label>
              <Input
                id="new-store-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={ts("placeholder")}
                className="h-11"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>{ts("countryLabel")}</Label>
              <Select value={country} onValueChange={(v) => setCountry(v ?? DEFAULT_COUNTRY)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue>
                    {(val) => {
                      const c = STRIPE_COUNTRIES.find((x) => x.code === val);
                      return c ? `${c.flag} ${c.label}` : ts("chooseCountry");
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
              <p className="text-xs text-muted-foreground">{ts("countryHint")}</p>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl font-semibold"
              >
                {loading ? ts("submitting") : t("openStoreCta")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
