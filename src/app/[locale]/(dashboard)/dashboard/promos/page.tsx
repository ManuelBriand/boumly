"use client";

import { useEffect, useState } from "react";
import { Plus, Ticket, Pencil, Trash2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, currencySymbol, cn } from "@/lib/utils";
import { currencyForCountry } from "@/lib/countries";
import {
  subscribeToPromoCodes,
  createPromoCode,
  updatePromoCode,
  togglePromoCode,
  deletePromoCode,
  type PromoInput,
} from "@/services/promo.service";
import type { PromoCode, DiscountType } from "@/types";

function discountLabel(
  p: Pick<PromoCode, "discountType" | "discountValue">,
  currency: string,
  locale: string
) {
  return p.discountType === "percentage"
    ? `-${p.discountValue} %`
    : `-${formatCurrency(p.discountValue, currency, locale)}`;
}

export default function PromosPage() {
  const { store } = useAuth();
  const currency = currencyForCountry(store?.country);
  const symbol = currencySymbol(currency);
  const locale = useLocale();
  const t = useTranslations("dashboard.promos");
  const tc = useTranslations("common");
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [formKey, setFormKey] = useState(0); // remonte le dialog → champs réinitialisés
  const [toDelete, setToDelete] = useState<PromoCode | null>(null);

  useEffect(() => {
    if (!store) return;
    const unsub = subscribeToPromoCodes(store.id, (c) => {
      setCodes(c);
      setLoading(false);
    });
    return unsub;
  }, [store]);

  function openCreate() {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  function openEdit(code: PromoCode) {
    setEditing(code);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  async function handleToggle(code: PromoCode, active: boolean) {
    try {
      await togglePromoCode(code.id, active);
    } catch {
      toast.error(t("updateError"));
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await deletePromoCode(toDelete.id);
      toast.success(t("deleted"));
      setToDelete(null);
    } catch {
      toast.error(t("deleteError"));
    }
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <Button onClick={openCreate} className="h-9 rounded-xl gap-1.5 font-semibold">
            <Plus className="h-4 w-4" />
            {t("newCode")}
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : codes.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-8 w-8" />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Button onClick={openCreate} className="rounded-xl gap-1.5 font-semibold">
              <Plus className="h-4 w-4" />
              {t("newCode")}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {codes.map((code) => (
            <div
              key={code.id}
              className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-border"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Ticket className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-mono font-semibold text-foreground">{code.code}</p>
                  <Badge variant="secondary" className="shrink-0">
                    {discountLabel(code, currency, locale)}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("usageCount", { count: code.usedCount ?? 0 })}
                  {typeof code.maxUses === "number" && ` / ${code.maxUses}`}
                  {code.minOrderAmount ? ` · ${t("minPrefix")} ${formatCurrency(code.minOrderAmount, currency, locale)}` : ""}
                  {code.expiresAt ? ` · ${t("expPrefix")} ${code.expiresAt}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Switch
                  checked={code.active}
                  onCheckedChange={(v) => handleToggle(code, v)}
                />
                <Button variant="ghost" size="icon" onClick={() => openEdit(code)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setToDelete(code)}
                  className="text-destructive hover:bg-red-50 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PromoFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        storeId={store?.id}
        editing={editing}
        existingCodes={codes.map((c) => c.code)}
        symbol={symbol}
      />

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("deleteConfirmBody", { code: toDelete?.code ?? "" })}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Dialog de création / édition ──────────────────────────────────
function PromoFormDialog({
  open,
  onOpenChange,
  storeId,
  editing,
  existingCodes,
  symbol,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  storeId?: string;
  editing: PromoCode | null;
  existingCodes: string[];
  symbol: string;
}) {
  const t = useTranslations("dashboard.promos");
  const tc = useTranslations("common");
  // Le parent remonte ce composant (prop key) à chaque ouverture → les
  // initialiseurs ci-dessous repartent des valeurs de `editing`.
  const [code, setCode] = useState(() => editing?.code ?? "");
  const [type, setType] = useState<DiscountType>(
    () => editing?.discountType ?? "percentage"
  );
  const [value, setValue] = useState(() =>
    editing ? String(editing.discountValue) : ""
  );
  const [active, setActive] = useState(() => editing?.active ?? true);
  const [showOptions, setShowOptions] = useState(
    () => !!(editing?.expiresAt || editing?.maxUses != null || editing?.minOrderAmount != null)
  );
  const [expiresAt, setExpiresAt] = useState(() => editing?.expiresAt ?? "");
  const [maxUses, setMaxUses] = useState(() =>
    editing?.maxUses != null ? String(editing.maxUses) : ""
  );
  const [minOrder, setMinOrder] = useState(() =>
    editing?.minOrderAmount != null ? String(editing.minOrderAmount) : ""
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!storeId) return;
    const trimmedCode = code.trim().toUpperCase();
    const numValue = Number(value);
    if (!trimmedCode) return toast.error(t("errorEnterCode"));
    if (!editing && existingCodes.includes(trimmedCode))
      return toast.error(t("errorCodeExists"));
    if (!numValue || numValue <= 0) return toast.error(t("errorInvalidDiscount"));
    if (type === "percentage" && numValue > 100)
      return toast.error(t("errorPercentMax"));

    const data: Omit<PromoInput, "code"> = {
      discountType: type,
      discountValue: numValue,
      active,
      ...(expiresAt ? { expiresAt } : {}),
      ...(maxUses && Number(maxUses) > 0 ? { maxUses: Number(maxUses) } : {}),
      ...(minOrder && Number(minOrder) > 0 ? { minOrderAmount: Number(minOrder) } : {}),
    };

    setSaving(true);
    try {
      if (editing) {
        await updatePromoCode(editing.id, data);
        toast.success(t("updated"));
      } else {
        await createPromoCode(storeId, { code: trimmedCode, ...data });
        toast.success(t("created"));
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t("editTitle") : t("newCode")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Code */}
          <div className="space-y-1.5">
            <Label htmlFor="promo-code">{t("codeLabel")}</Label>
            <Input
              id="promo-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ETE2026"
              disabled={!!editing}
              className="font-mono uppercase"
            />
            {editing && (
              <p className="text-xs text-muted-foreground">
                {t("codeNotEditable")}
              </p>
            )}
          </div>

          {/* Type + valeur */}
          <div className="space-y-1.5">
            <Label>{t("discountLabel")}</Label>
            <div className="flex gap-2">
              <div className="flex rounded-xl bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setType("percentage")}
                  className={cn(
                    "rounded-lg px-3 text-sm font-medium transition-colors",
                    type === "percentage"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setType("fixed")}
                  className={cn(
                    "rounded-lg px-3 text-sm font-medium transition-colors",
                    type === "fixed"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                >
                  {symbol}
                </button>
              </div>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "percentage" ? "10" : "5"}
                className="flex-1"
              />
            </div>
          </div>

          {/* Actif */}
          <div className="flex items-center justify-between">
            <Label htmlFor="promo-active">{t("activeLabel")}</Label>
            <Switch id="promo-active" checked={active} onCheckedChange={setActive} />
          </div>

          {/* Options avancées (toutes optionnelles) */}
          {showOptions ? (
            <div className="space-y-4 rounded-xl bg-muted/40 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="promo-exp">{t("expiryLabel")}</Label>
                <Input
                  id="promo-exp"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promo-max">{t("maxUsesLabel")}</Label>
                <Input
                  id="promo-max"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder={t("unlimited")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="promo-min">{t("minOrderLabel", { symbol })}</Label>
                <Input
                  id="promo-min"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={minOrder}
                  onChange={(e) => setMinOrder(e.target.value)}
                  placeholder={t("none")}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowOptions(true)}
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("moreOptions")}
            </button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="font-semibold">
            {saving ? t("saving") : editing ? tc("save") : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
