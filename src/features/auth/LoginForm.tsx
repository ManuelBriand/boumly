"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { LoginSchema, type LoginInput } from "@/lib/validations/auth";
import { signIn, signInWithGoogle, isPopupCancelled } from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton, AuthDivider } from "@/features/auth/GoogleButton";
import { ForgotPasswordLink } from "@/features/auth/ForgotPasswordLink";

export function LoginForm() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const t = useTranslations("auth.login");
  const tf = useTranslations("auth.fields");
  const tv = useTranslations("validation");
  const ta = useTranslations("auth");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    try {
      await signIn(data);
      router.push("/dashboard");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t("genericError");
      toast.error(
        msg.includes("invalid-credential") ? t("invalidCredentials") : msg
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      await signInWithGoogle();
      await refreshAuth();
      router.push("/dashboard");
    } catch (error: unknown) {
      if (isPopupCancelled(error)) {
        toast.error(ta("googleCancelled"));
      } else {
        console.error("Google sign-in failed", error);
        toast.error(ta("googleError"));
      }
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">{tf("email")}</Label>
        <Input
          id="email"
          type="email"
          placeholder={tf("emailPlaceholder")}
          className="h-11"
          {...register("email")}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{tv(errors.email.message!)}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{tf("password")}</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          className="h-11"
          {...register("password")}
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="text-xs text-destructive">
            {tv(errors.password.message!)}
          </p>
        )}
        <div className="flex justify-end">
          <ForgotPasswordLink email={watch("email")} />
        </div>
      </div>

      <Button
        type="submit"
        className="h-11 w-full rounded-xl text-base font-semibold"
        disabled={loading}
      >
        {loading ? t("submitting") : t("submit")}
      </Button>

      <AuthDivider />
      <GoogleButton onClick={handleGoogle} disabled={loading} />
    </form>
  );
}
