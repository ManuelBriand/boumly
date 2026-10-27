"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { EventForm } from "@/features/events/EventForm";
import { createEvent } from "@/services/event.service";
import type { EventInput } from "@/lib/validations/event";

export default function NewEventPage() {
  const t = useTranslations("events");
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(input: EventInput) {
    if (!firebaseUser) return;
    setSubmitting(true);
    try {
      const { id } = await createEvent(firebaseUser, input);
      toast.success(t("created_toast"));
      router.push(`/dashboard/events/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6 lg:p-8 pb-24 md:pb-8">
      <Link href="/dashboard/events" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>
      <PageHeader title={t("createTitle")} description={t("createSubtitle")} />
      <div className="mt-6">
        <EventForm onSubmit={handleCreate} submitting={submitting} />
      </div>
    </div>
  );
}
