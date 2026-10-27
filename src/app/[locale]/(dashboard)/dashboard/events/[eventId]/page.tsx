"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { ArrowLeft, Settings, Users, Copy, Check, ExternalLink, ClipboardList, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEventById } from "@/services/event.service";
import { getRegistrationsByEvent } from "@/services/eventRegistration.service";
import type { Event, EventRegistration } from "@/types";

export default function EventOverviewPage() {
  const t = useTranslations("events");
  const locale = useLocale();
  const { eventId } = useParams<{ eventId: string }>();
  const { firebaseUser } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [regs, setRegs] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!eventId || !firebaseUser) return;
    Promise.all([
      getEventById(eventId),
      getRegistrationsByEvent(eventId, firebaseUser.uid),
    ])
      .then(([m, r]) => {
        setEvent(m);
        setRegs(r);
      })
      .finally(() => setLoading(false));
  }, [eventId, firebaseUser]);

  if (loading) {
    return <div className="p-6 lg:p-8"><Skeleton className="h-8 w-48 rounded-xl" /></div>;
  }
  if (!event) {
    return <div className="p-6 lg:p-8 text-sm text-muted-foreground">{t("notFound")}</div>;
  }

  const joinUrl =
    typeof window !== "undefined" ? `${window.location.origin}/${locale}/event/${event.slug}` : "";
  const pending = regs.filter((r) => r.status === "pending").length;
  const confirmed = regs.filter((r) => r.status === "paid").length;

  async function copyJoin() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      toast.success(t("inviteCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyError"));
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6 lg:p-8 pb-24 md:pb-8 space-y-6">
      <Link href="/dashboard/events" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{event.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{event.address || event.schedule?.description}</p>
        </div>
        <Badge variant={event.status === "published" ? "default" : "secondary"}>
          {t(`status_${event.status}`)}
        </Badge>
      </div>

      {/* Lien d'invitation */}
      <div className="rounded-2xl border border-border bg-white p-5 space-y-3">
        <p className="font-semibold text-foreground text-sm">{t("inviteTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("inviteHint")}</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 rounded-xl bg-muted/40 border border-border px-3 py-2.5">
            <p className="truncate font-mono text-xs text-muted-foreground">/event/{event.slug}</p>
          </div>
          <Button type="button" variant="outline" className="rounded-xl shrink-0" onClick={copyJoin}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          {event.status === "published" && (
            <Link href={`/event/${event.slug}`} target="_blank">
              <Button type="button" variant="outline" className="rounded-xl shrink-0">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-white p-4">
          <p className="text-2xl font-bold text-foreground">{pending}</p>
          <p className="text-xs text-muted-foreground">{t("statPending")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4">
          <p className="text-2xl font-bold text-foreground">{confirmed}</p>
          <p className="text-xs text-muted-foreground">{t("statConfirmed")}</p>
        </div>
      </div>

      {/* Liens */}
      <div className="space-y-2">
        <Link href={`/dashboard/events/${event.id}/registrations`} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 hover:bg-muted/40">
          <ClipboardList className="h-5 w-5 text-primary" />
          <span className="flex-1 text-sm font-medium text-foreground">{t("manageRegistrations")}</span>
          {pending > 0 && <Badge>{pending}</Badge>}
        </Link>
        <Link href={`/dashboard/events/${event.id}/members`} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 hover:bg-muted/40">
          <Users className="h-5 w-5 text-primary" />
          <span className="flex-1 text-sm font-medium text-foreground">{t("members")}</span>
        </Link>
        <Link href={`/dashboard/events/${event.id}/payments`} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 hover:bg-muted/40">
          <CreditCard className="h-5 w-5 text-primary" />
          <span className="flex-1 text-sm font-medium text-foreground">{t("paymentsTitle")}</span>
        </Link>
        <Link href={`/dashboard/events/${event.id}/settings`} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 hover:bg-muted/40">
          <Settings className="h-5 w-5 text-primary" />
          <span className="flex-1 text-sm font-medium text-foreground">{t("editEvent")}</span>
        </Link>
      </div>
    </div>
  );
}
