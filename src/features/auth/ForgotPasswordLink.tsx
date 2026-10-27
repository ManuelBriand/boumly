"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { resetPassword } from "@/services/auth.service";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lien « Mot de passe oublié ? » : envoie l'email de reset à partir de l'email
// déjà saisi dans le formulaire. Partagé par login vendeur, compte client, checkout.
export function ForgotPasswordLink({
  email,
  className,
}: {
  email?: string;
  className?: string;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [sending, setSending] = useState(false);

  async function handleClick() {
    const e = email?.trim();
    if (!e || !EMAIL_RE.test(e)) {
      toast.error(t("enterEmailFirst"));
      return;
    }
    setSending(true);
    try {
      await resetPassword(e, locale);
      toast.success(t("resetSent"));
    } catch {
      toast.error(t("resetError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={sending}
      className={
        className ??
        "text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
      }
    >
      {t("forgotPassword")}
    </button>
  );
}
