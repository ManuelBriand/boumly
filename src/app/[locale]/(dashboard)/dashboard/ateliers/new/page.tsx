"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrestationForm } from "@/features/bookings/PrestationForm";
import { createPrestation } from "@/services/booking.service";
import type { PrestationInput } from "@/lib/validations/booking";

export default function NewAtelierPage() {
  const t = useTranslations("ateliers");
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(input: PrestationInput) {
    if (!firebaseUser) return;
    setSubmitting(true);
    try {
      const { id } = await createPrestation(firebaseUser, input);
      toast.success(t("createdToast"));
      router.push(`/dashboard/ateliers/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6 lg:p-8 pb-24 md:pb-8">
      <Link href="/dashboard/ateliers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>
      <PageHeader title={t("createTitle")} description={t("createSubtitle")} />
      <div className="mt-6">
        <PrestationForm onSubmit={handleCreate} submitting={submitting} />
      </div>
    </div>
  );
}
