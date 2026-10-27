"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { fromMinorUnits } from "@/lib/countries";
import { getRegistrationsByEvent } from "@/services/eventRegistration.service";
import { getStoreByOwnerId } from "@/services/store.service";
import type { EventRegistration, Store } from "@/types";

// Exposants confirmés (payés) + places en attente de paiement.
const MEMBER_STATUSES = ["paid", "payment_pending"];

export default function EventMembersPage() {
  const t = useTranslations("events");
  const { eventId } = useParams<{ eventId: string }>();
  const { firebaseUser } = useAuth();
  const [members, setMembers] = useState<EventRegistration[] | null>(null);
  const [stores, setStores] = useState<Record<string, Store>>({});

  useEffect(() => {
    if (!eventId || !firebaseUser) return;
    getRegistrationsByEvent(eventId, firebaseUser.uid).then(async (list) => {
      const filtered = list.filter((r) => MEMBER_STATUSES.includes(r.status));
      setMembers(filtered);
      const ids = [...new Set(filtered.map((r) => r.storeId))];
      const entries = await Promise.all(
        ids.map(async (id) => [id, await getStoreByOwnerId(id)] as const)
      );
      setStores(Object.fromEntries(entries.filter(([, s]) => s) as [string, Store][]));
    });
  }, [eventId, firebaseUser]);

  if (members === null) {
    return <div className="p-6 lg:p-8"><Skeleton className="h-8 w-48 rounded-xl" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl p-6 lg:p-8 pb-24 md:pb-8 space-y-5">
      <Link href={`/dashboard/events/${eventId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>
      <h1 className="text-2xl font-bold text-foreground">{t("membersTitle")}</h1>

      {members.length === 0 ? (
        <EmptyState icon={<Users className="h-7 w-7" />} title={t("noMembers")} />
      ) : (
        <div className="space-y-3">
          {members.map((r) => {
            const store = stores[r.storeId];
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{store?.name ?? t("unknownStore")}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(fromMinorUnits(r.amount, r.currency), r.currency)}
                    {r.categoryName ? ` · ${r.categoryName}` : ""}
                  </p>
                </div>
                <Badge variant={r.status === "paid" ? "default" : "secondary"}>{t(`reg_${r.status}`)}</Badge>
                {store && (
                  <Link href={`/store/${store.slug}`} target="_blank">
                    <Button variant="outline" size="icon" className="rounded-xl h-8 w-8"><ExternalLink className="h-4 w-4" /></Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
