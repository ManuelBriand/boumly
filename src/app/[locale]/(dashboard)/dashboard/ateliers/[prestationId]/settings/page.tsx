"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { PrestationForm } from "@/features/bookings/PrestationForm";
import { getPrestationById, updatePrestation } from "@/services/booking.service";
import type { PrestationInput } from "@/lib/validations/booking";
import type { Prestation } from "@/types";

export default function AtelierSettingsPage() {
  const t = useTranslations("ateliers");
  const router = useRouter();
  const { prestationId } = useParams<{ prestationId: string }>();
  const { firebaseUser } = useAuth();
  const [prestation, setPrestation] = useState<Prestation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getPrestationById(prestationId).then(setPrestation).catch(() => setPrestation(null));
  }, [prestationId]);

  async function handleUpdate(input: PrestationInput) {
    if (!firebaseUser) return;
    setSubmitting(true);
    try {
      await updatePrestation(firebaseUser, prestationId, input);
      toast.success(t("savedToast"));
      router.push(`/dashboard/ateliers/${prestationId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6 lg:p-8 pb-24 md:pb-8">
      <Link href={`/dashboard/ateliers/${prestationId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> {t("back")}
      </Link>
      <PageHeader title={t("settingsTitle")} description={t("settingsSubtitle")} />
      <div className="mt-6">
        {prestation ? (
          <PrestationForm prestation={prestation} onSubmit={handleUpdate} submitting={submitting} />
        ) : (
          <Skeleton className="h-96 w-full rounded-2xl" />
        )}
      </div>
    </div>
  );
}
