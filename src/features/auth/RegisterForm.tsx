"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { RegisterSchema, type RegisterInput } from "@/lib/validations/auth";
import { signUp, signUpSellerWithGoogle, isPopupCancelled } from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";
import { STRIPE_COUNTRIES, DEFAULT_COUNTRY } from "@/lib/countries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { GoogleButton, AuthDivider } from "@/features/auth/GoogleButton";

export function RegisterForm() {
  const router = useRouter();
  const { refreshStore, refreshAuth } = useAuth();
  const t = useTranslations("auth.register");
  const ta = useTranslations("auth");
  const tf = useTranslations("auth.fields");
  const tv = useTranslations("validation");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { country: DEFAULT_COUNTRY },
  });
  const country = watch("country") ?? DEFAULT_COUNTRY;
  const acceptTerms = watch("acceptTerms");

  async function onSubmit(data: RegisterInput) {
    setLoading(true);
    try {
      await signUp(data);
      // signUp crée le doc boutique après l'auth → l'AuthContext a pu lire null.
      // On rafraîchit pour que l'onboarding s'affiche sans recharger la page.
      await refreshStore();
      router.push("/dashboard");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : t("genericError");
      toast.error(
        msg.includes("email-already-in-use") ? t("emailInUse") : msg
      );
    } finally {
      setLoading(false);
    }
  }

  // Création vendeur via Google : pas de boutique → le dashboard demande le nom.
  async function handleGoogle() {
    if (!acceptTerms) {
      toast.error(tv("acceptTermsRequired"));
      return;
    }
    setLoading(true);
    try {
      await signUpSellerWithGoogle();
      await refreshAuth();
      router.push("/dashboard");
    } catch (error: unknown) {
      if (isPopupCancelled(error)) {
        toast.error(ta("googleCancelled"));
      } else {
        console.error("Google sign-up failed", error);
        toast.error(ta("googleError"));
      }
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="storeName">{tf("storeName")}</Label>
        <Input
          id="storeName"
          type="text"
          placeholder={tf("storeNamePlaceholder")}
          className="h-11"
          {...register("storeName")}
          aria-invalid={!!errors.storeName}
        />
        {errors.storeName && (
          <p className="text-xs text-destructive">
            {tv(errors.storeName.message!)}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>{tf("country")}</Label>
        <Select
          value={country}
          onValueChange={(v) => setValue("country", v ?? DEFAULT_COUNTRY, { shouldValidate: true })}
        >
          <SelectTrigger className="h-11 rounded-xl">
            <SelectValue>
              {(val) => {
                const c = STRIPE_COUNTRIES.find((x) => x.code === val);
                return c ? `${c.flag} ${c.label}` : tf("countryPlaceholder");
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STRIPE_COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.flag} {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{tf("countryHint")}</p>
      </div>

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
      </div>

      <div className="space-y-1.5">
        <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
            {...register("acceptTerms")}
            aria-invalid={!!errors.acceptTerms}
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
        {errors.acceptTerms && (
          <p className="text-xs text-destructive">{tv("acceptTermsRequired")}</p>
        )}
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
