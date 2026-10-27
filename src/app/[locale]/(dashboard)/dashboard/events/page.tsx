"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Store } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { getEventsByOrganizer } from "@/services/event.service";
import type { Event } from "@/types";

const STATUS_VARIANT: Record<Event["status"], "default" | "secondary" | "outline"> = {
  published: "default",
  draft: "secondary",
  archived: "outline",
};

export default function EventsPage() {
  const t = useTranslations("events");
  const { firebaseUser, loading } = useAuth();
  const [events, setEvents] = useState<Event[] | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    getEventsByOrganizer(firebaseUser.uid).then(setEvents).catch(() => setEvents([]));
  }, [firebaseUser]);

  if (loading) {
    return <div className="p-6 lg:p-8"><Skeleton className="h-8 w-40 rounded-xl" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8 pb-24 md:pb-8 space-y-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <Link href="/dashboard/events/new">
            <Button className="rounded-xl"><Plus className="h-4 w-4 mr-1" /> {t("create")}</Button>
          </Link>
        }
      />

      {events === null ? (
        <Skeleton className="h-24 w-full rounded-2xl" />
      ) : events.length === 0 ? (
        <EmptyState icon={<Store className="h-7 w-7" />} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="space-y-3">
          {events.map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/events/${m.id}`}
              className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 hover:bg-muted/40 transition-colors"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                {m.photoUrl ? (
                  <Image src={m.photoUrl} alt={m.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xl">🛒</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{m.name}</p>
                <p className="truncate text-xs text-muted-foreground">{m.address || m.schedule?.description}</p>
              </div>
              <Badge variant={STATUS_VARIANT[m.status]}>{t(`status_${m.status}`)}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
