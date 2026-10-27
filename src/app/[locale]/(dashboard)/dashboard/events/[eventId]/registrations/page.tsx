"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { fromMinorUnits } from "@/lib/countries";
import { getRegistrationsByEvent, approveRegistration, rejectRegistration } from "@/services/eventRegistration.service";
import { getStoreByOwnerId } from "@/services/store.service";
import type { EventRegistration, EventRegistrationStatus, Store } from "@/types";

type Tab = "pending" | "approved" | "rejected";

const TAB_STATUSES: Record<Tab, EventRegistrationStatus[]> = {
  pending: ["pending"],
  approved: ["payment_pending", "approved", "paid"],
  rejected: ["rejected", "cancelled"],
};

function amountLabel(r: EventRegistration): string {
  return formatCurrency(fromMinorUnits(r.amount, r.currency), r.currency);
}

function RegistrationRow({
  r,
  store,
  busy,
  onApprove,
  onReject,
}: {
  r: EventRegistration;
  store?: Store;
  busy: boolean;
  onApprove: () => void;
  onReject: (note: string) => void;
}) {
  const t = useTranslations("events");
  const [note, setNote] = useState("");
  return (
    <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{store?.name ?? t("unknownStore")}</p>
          {store?.activity && <p className="text-xs font-medium text-primary/80">{store.activity}</p>}
          {r.categoryName && <p className="text-xs text-muted-foreground">{r.categoryName}</p>}
          <p className="text-sm font-medium text-primary mt-0.5">{amountLabel(r)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={r.status === "paid" ? "default" : "secondary"}>{t(`reg_${r.status}`)}</Badge>
          {store && (
            <Link href={`/store/${store.slug}`} target="_blank">
              <Button variant="outline" size="icon" className="rounded-xl h-8 w-8"><ExternalLink className="h-4 w-4" /></Button>
            </Link>
          )}
        </div>
      </div>
      {store?.description && <p className="text-xs text-foreground/80">{store.description}</p>}
      {r.note && <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2">{r.note}</p>}

      {r.status === "pending" && (
        <div className="flex gap-2">
          <Button onClick={onApprove} disabled={busy} size="sm" className="rounded-xl flex-1">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> {t("approve")}</>}
          </Button>
          <Dialog>
            <DialogTrigger
              disabled={busy}
              render={<Button variant="outline" size="sm" className="rounded-xl flex-1" />}
            >
              <X className="h-4 w-4 mr-1" /> {t("reject")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("rejectTitle")}</DialogTitle></DialogHeader>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("rejectNotePlaceholder")} className="min-h-24" />
              <DialogFooter>
                <Button variant="destructive" onClick={() => onReject(note)} disabled={busy} className="rounded-xl">
                  {t("confirmReject")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

export default function RegistrationsPage() {
  const t = useTranslations("events");
  const { eventId } = useParams<{ eventId: string }>();
  const { firebaseUser } = useAuth();
  const [regs, setRegs] = useState<EventRegistration[] | null>(null);
  const [stores, setStores] = useState<Record<string, Store>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pending");

  const load = useCallback(async () => {
    if (!eventId || !firebaseUser) return;
    const list = await getRegistrationsByEvent(eventId, firebaseUser.uid);
    setRegs(list);
    const ids = [...new Set(list.map((r) => r.storeId))];
    const entries = await Promise.all(
      ids.map(async (id) => [id, await getStoreByOwnerId(id)] as const)
    );
    setStores(Object.fromEntries(entries.filter(([, s]) => s) as [string, Store][]));
  }, [eventId, firebaseUser]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des données au montage
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const r = regs ?? [];
    return {
      pending: r.filter((x) => TAB_STATUSES.pending.includes(x.status)),
      approved: r.filter((x) => TAB_STATUSES.approved.includes(x.status)),
      rejected: r.filter((x) => TAB_STATUSES.rejected.includes(x.status)),
    };
  }, [regs]);

  async function approve(r: EventRegistration) {
    if (!firebaseUser) return;
    setBusyId(r.id);
    try {
      await approveRegistration(firebaseUser, r.eventId, r.id);
      toast.success(t("approved_toast"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("actionError"));
    } finally {
      setBusyId(null);
    }
  }

  async function reject(r: EventRegistration, note: string) {
    if (!firebaseUser) return;
    setBusyId(r.id);
    try {
      await rejectRegistration(firebaseUser, r.eventId, r.id, note || undefined);
      toast.success(t("rejected_toast"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("actionError"));
    } finally {
      setBusyId(null);
    }
  }

  if (regs === null) {
    return <div className="p-6 lg:p-8"><Skeleton className="h-8 w-48 rounded-xl" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6 lg:p-8 pb-24 md:pb-8 space-y-5">
      <Link href={`/dashboard/events/${eventId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>
      <h1 className="text-2xl font-bold text-foreground">{t("registrationsTitle")}</h1>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1">{t("tabPending")} ({grouped.pending.length})</TabsTrigger>
          <TabsTrigger value="approved" className="flex-1">{t("tabApproved")} ({grouped.approved.length})</TabsTrigger>
          <TabsTrigger value="rejected" className="flex-1">{t("tabRejected")} ({grouped.rejected.length})</TabsTrigger>
        </TabsList>
        {(["pending", "approved", "rejected"] as Tab[]).map((key) => (
          <TabsContent key={key} value={key} className="mt-4 space-y-3">
            {grouped[key].length === 0 ? (
              <EmptyState title={t("noRegistrations")} />
            ) : (
              grouped[key].map((r) => (
                <RegistrationRow
                  key={r.id}
                  r={r}
                  store={stores[r.storeId]}
                  busy={busyId === r.id}
                  onApprove={() => approve(r)}
                  onReject={(note) => reject(r, note)}
                />
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
