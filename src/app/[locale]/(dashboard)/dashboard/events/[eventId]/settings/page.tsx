"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { EventForm } from "@/features/events/EventForm";
import { getEventById, updateEvent } from "@/services/event.service";
import type { Event } from "@/types";
import type { EventInput } from "@/lib/validations/event";

export default function EditEventPage() {
  const t = useTranslations("events");
  const { eventId } = useParams<{ eventId: string }>();
  const { firebaseUser } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    getEventById(eventId).then(setEvent).finally(() => setLoading(false));
  }, [eventId]);

  async function handleUpdate(input: EventInput) {
    if (!firebaseUser || !event) return;
    setSubmitting(true);
    try {
      await updateEvent(firebaseUser, event.id, input);
      toast.success(t("saved"));
      const fresh = await getEventById(event.id);
      if (fresh) setEvent(fresh);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-6 lg:p-8"><Skeleton className="h-8 w-48 rounded-xl" /></div>;
  }
  if (!event) {
    return <div className="p-6 lg:p-8 text-sm text-muted-foreground">{t("notFound")}</div>;
  }

  return (
    <div className="mx-auto max-w-xl p-6 lg:p-8 pb-24 md:pb-8">
      <Link href={`/dashboard/events/${event.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>
      <PageHeader title={t("editTitle")} description={event.name} />
      <div className="mt-6">
        <EventForm event={event} onSubmit={handleUpdate} submitting={submitting} />
      </div>
    </div>
  );
}
