"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { UserPlus, LogIn } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  signIn,
  signUpCustomer,
  signInWithGoogle,
  isPopupCancelled,
} from "@/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ForgotPasswordLink } from "@/features/auth/ForgotPasswordLink";

function GoogleButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const t = useTranslations("inlineAuth");
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
        <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.47 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 4.75 12 4.75Z" />
      </svg>
      {t("continueWithGoogle")}
    </button>
  );
}

/**
 * Bloc d'authentification inline (sans redirection).
 * À la connexion réussie, AuthContext se met à jour → le checkout préremplit.
 */
export function InlineAuth({
  defaultOpen = false,
  allowGuest = true,
}: {
  defaultOpen?: boolean;
  allowGuest?: boolean;
}) {
  const t = useTranslations("inlineAuth");
  const tf = useTranslations("auth.fields");
  const tv = useTranslations("validation");
  const [open, setOpen] = useState(defaultOpen);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || password.length < 6 || (mode === "register" && name.trim().length < 2)) {
      toast.error(t("checkFields"));
      return;
    }
    if (mode === "register" && !acceptTerms) {
      toast.error(tv("acceptTermsRequired"));
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "login") {
        await signIn({ email, password });
      } else {
        await signUpCustomer({ name: name.trim(), email, password, acceptTerms: true });
      }
      toast.success(t("connected"));
    } catch {
      toast.error(mode === "login" ? t("invalidCredentials") : t("emailInUse"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    if (mode === "register" && !acceptTerms) {
      toast.error(tv("acceptTermsRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await signInWithGoogle();
      toast.success(t("connected"));
    } catch (error: unknown) {
      if (isPopupCancelled(error)) {
        toast.error(t("googleCancelled"));
      } else {
        console.error("Google sign-in failed", error);
        toast.error(t("googleError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!open && allowGuest) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <UserPlus className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-foreground truncate">
            {t("trackPrompt")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 text-sm font-semibold text-primary hover:underline"
        >
          {t("login")}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">
          {mode === "login" ? t("loginTitle") : t("registerTitle")}
        </p>
        {allowGuest && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("continueGuest")}
          </button>
        )}
      </div>

      <GoogleButton onClick={handleGoogle} disabled={submitting} />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{t("or")}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* form (pas de <form> imbriqué : on est déjà dans le form checkout) */}
      <div className="space-y-2.5">
        {mode === "register" && (
          <div className="space-y-1">
            <Label htmlFor="ia-name">{t("name")}</Label>
            <Input id="ia-name" value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="ia-email">{t("email")}</Label>
          <Input id="ia-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ia-password">{t("password")}</Label>
          <Input id="ia-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10" />
          {mode === "login" && (
            <div className="flex justify-end">
              <ForgotPasswordLink email={email} />
            </div>
          )}
        </div>
        {mode === "register" && (
          <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
            />
            <span>
              {tf.rich("acceptTerms", {
                cgu: (chunks) => (
                  <Link href="/cgu" target="_blank" className="font-medium text-primary hover:underline">
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link
                    href="/politique-confidentialite"
                    target="_blank"
                    className="font-medium text-primary hover:underline"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </span>
          </label>
        )}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="h-10 w-full rounded-xl font-semibold gap-2"
        >
          {mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {submitting ? "..." : mode === "login" ? t("loginSubmit") : t("registerSubmit")}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {mode === "login" ? t("noAccountPrompt") : t("hasAccountPrompt")}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="font-semibold text-primary hover:underline"
        >
          {mode === "login" ? t("switchToRegister") : t("switchToLogin")}
        </button>
      </p>
    </div>
  );
}
