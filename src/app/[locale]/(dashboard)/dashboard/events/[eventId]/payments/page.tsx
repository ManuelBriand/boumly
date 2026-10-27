"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectOnboardingCard } from "@/features/store/ConnectOnboardingCard";
import { StripePayoutsPanel } from "@/features/store/StripePayoutsPanel";
import { getEventById } from "@/services/event.service";
import type { Event } from "@/types";

export default function EventPaymentsPage() {
  const t = useTranslations("events");
  const { eventId } = useParams<{ eventId: string }>();
  const { firebaseUser, user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    getEventById(eventId).then(setEvent).finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return <div className="p-6 lg:p-8"><Skeleton className="h-8 w-48 rounded-xl" /></div>;
  }
  if (!event) {
    return <div className="p-6 lg:p-8 text-sm text-muted-foreground">{t("notFound")}</div>;
  }

  const connected = user?.stripeChargesEnabled === true;

  return (
    <div className="mx-auto max-w-2xl p-6 lg:p-8 pb-24 md:pb-8 space-y-5">
      <Link href={`/dashboard/events/${event.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>
      <h1 className="text-2xl font-bold text-foreground">{t("paymentsTitle")}</h1>

      {firebaseUser && !connected && <ConnectOnboardingCard firebaseUser={firebaseUser} target="organizer" />}
      {firebaseUser && connected && (
        <StripePayoutsPanel firebaseUser={firebaseUser} target="organizer" />
      )}
    </div>
  );
}
