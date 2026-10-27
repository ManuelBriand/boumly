"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  User, LogOut, Package, ArrowLeft, LayoutDashboard, ShoppingBag, Tent, CalendarClock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  signIn, signUpCustomer, signInWithGoogle, signOut, isPopupCancelled,
} from "@/services/auth.service";
import { subscribeCustomerOrders } from "@/services/order.service";
import { getRegistrationsByUser } from "@/services/eventRegistration.service";
import { getReservationsByClient } from "@/services/reservation.service";
import {
  LoginSchema, CustomerRegisterSchema,
  type LoginInput, type CustomerRegisterInput,
} from "@/lib/validations/auth";
import { StatusBadge } from "@/features/orders/StatusBadge";
import { ForgotPasswordLink } from "@/features/auth/ForgotPasswordLink";
import { CreateStoreCard } from "@/features/account/CreateStoreCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { fromMinorUnits } from "@/lib/countries";
import type { Order, EventRegistration, Reservation, ReservationStatut } from "@/types";

// Libellé de créneau (UTC, cohérent avec l'affichage des ateliers).
function formatSlotUTC(ts: { toDate: () => Date }): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  }).format(ts.toDate());
}

const BOOKING_STATUS_KEY: Record<ReservationStatut, string> = {
  confirmee: "statusConfirmee",
  en_attente: "statusEnAttente",
  payment_pending: "statusPaymentPending",
  annulee_createur: "statusAnnulee",
  terminee: "statusTerminee",
};

function GoogleButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const t = useTranslations("account");
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

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const { firebaseUser, user, isSeller, loading } = useAuth();
  const locale = useLocale();
  const t = useTranslations("account");
  const te = useTranslations("events");
  const ta = useTranslations("ateliers");
  const tf = useTranslations("auth.fields");
  const tv = useTranslations("validation");

  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [marketReqs, setMarketReqs] = useState<EventRegistration[]>([]);
  const [bookings, setBookings] = useState<Reservation[]>([]);

  const loginForm = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });
  const registerForm = useForm<CustomerRegisterInput>({ resolver: zodResolver(CustomerRegisterSchema) });

  // Charge l'historique d'achat du user connecté (un vendeur peut aussi acheter).
  useEffect(() => {
    if (!firebaseUser) {
      setOrdersLoading(false);
      return;
    }
    const unsub = subscribeCustomerOrders(firebaseUser.uid, (o) => {
      setOrders(o);
      setOrdersLoading(false);
    });
    return unsub;
  }, [firebaseUser]);

  // Demandes de marché de l'utilisateur (suivi du statut).
  useEffect(() => {
    if (!firebaseUser) return;
    getRegistrationsByUser(firebaseUser.uid).then(setMarketReqs).catch(() => setMarketReqs([]));
  }, [firebaseUser]);

  // Réservations d'ateliers de l'utilisateur (suivi du statut).
  useEffect(() => {
    if (!firebaseUser) return;
    getReservationsByClient(firebaseUser.uid).then(setBookings).catch(() => setBookings([]));
  }, [firebaseUser]);

  // Redirige vers `next` uniquement après une action de connexion réussie
  function afterAuth() {
    if (next) router.replace(next);
  }

  async function onLogin(data: LoginInput) {
    setSubmitting(true);
    try {
      await signIn(data);
      toast.success(t("connected"));
      afterAuth();
    } catch {
      toast.error(t("invalidCredentials"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onRegister(data: CustomerRegisterInput) {
    setSubmitting(true);
    try {
      await signUpCustomer(data);
      toast.success(t("accountCreated"));
      afterAuth();
    } catch {
      toast.error(t("createFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onGoogle() {
    if (mode === "register" && !registerForm.watch("acceptTerms")) {
      toast.error(tv("acceptTermsRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await signInWithGoogle();
      toast.success(t("connected"));
      afterAuth();
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

  async function handleLogout() {
    await signOut();
    setOrders([]);
    setMarketReqs([]);
    setBookings([]);
    toast.success(t("loggedOut"));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center animate-pulse">
          <span className="text-white font-bold">B</span>
        </div>
      </div>
    );
  }

  // ── Connecté ───────────────────────────────────────────────────
  if (firebaseUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">
                  {user?.name ?? user?.storeName ?? t("myAccount")}
                </p>
                <p className="text-xs text-muted-foreground">{firebaseUser.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </button>
          </div>

          {/* Seller shortcut OU CTA ouvrir une boutique (client) */}
          {isSeller ? (
            <Link
              href="/dashboard"
              className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-white p-4 hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-sm">{t("sellerDashboard")}</p>
                <p className="text-xs text-muted-foreground">{t("sellerDashboardSub")}</p>
              </div>
            </Link>
          ) : (
            <CreateStoreCard />
          )}

          {/* Demandes de marché */}
          {marketReqs.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">{t("myMarketRequests")}</h2>
              <div className="space-y-3">
                {marketReqs.map((r) => (
                  <div key={r.id} className="rounded-2xl bg-white ring-1 ring-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Tent className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{r.eventName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(fromMinorUnits(r.amount, r.currency), r.currency, locale)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={r.status === "paid" ? "default" : "secondary"} className="shrink-0">
                        {te(`reg_${r.status}`)}
                      </Badge>
                    </div>
                    {r.status === "payment_pending" && (
                      <Link
                        href={`/event/${r.eventSlug}/register?reg=${r.id}`}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <ShoppingBag className="h-3 w-3" />
                        {t("payRequest")}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Réservations d'ateliers */}
          {bookings.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-foreground mb-4">{t("myBookings")}</h2>
              <div className="space-y-3">
                {bookings.map((b) => (
                  <div key={b.id} className="rounded-2xl bg-white ring-1 ring-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <CalendarClock className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {b.prestationNom ?? ta("title")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {b.dateHeure ? formatSlotUTC(b.dateHeure) : ""}
                            {" · "}
                            {formatCurrency(fromMinorUnits(b.amount, b.currency), b.currency, locale)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={b.statut === "confirmee" ? "default" : b.statut === "annulee_createur" ? "outline" : "secondary"}
                        className="shrink-0"
                      >
                        {ta(BOOKING_STATUS_KEY[b.statut])}
                      </Badge>
                    </div>
                    {b.statut === "payment_pending" && b.prestationSlug && (
                      <Link
                        href={`/atelier/${b.prestationSlug}?resa=${b.id}`}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <ShoppingBag className="h-3 w-3" />
                        {t("payBooking")}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <h1 className="text-xl font-bold text-foreground mb-4">{t("myOrders")}</h1>

          {ordersLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground text-sm">{t("noOrdersTitle")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("noOrdersSub")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="rounded-2xl bg-white ring-1 ring-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {order.storeName ?? t("store")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateTime(order.createdAt)} · {t("itemCount", { count: order.items.length })}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className="font-bold text-foreground">{formatCurrency(order.total, order.currency, locale)}</span>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                  <div className="mt-3 border-t border-border pt-2 space-y-0.5">
                    {order.items.map((it, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        {it.quantity}× {it.name}
                        {it.variantLabel ? ` · ${it.variantLabel}` : ""}
                      </p>
                    ))}
                  </div>
                  {order.storeSlug && (
                    <Link
                      href={`/store/${order.storeSlug}`}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <ShoppingBag className="h-3 w-3" />
                      {t("viewStore")}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Déconnecté : auth ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="mx-auto w-full max-w-md px-4 py-10">
        {next && (
          <Link
            href={next}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Link>
        )}

        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mb-3">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "login" ? t("loginTitle") : t("registerTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("authSubtitle")}
          </p>
        </div>

        <div className="rounded-2xl bg-white ring-1 ring-border p-6 space-y-4">
          <GoogleButton onClick={onGoogle} disabled={submitting} />

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{t("or")}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {mode === "login" ? (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">{tf("email")}</Label>
                <Input id="email" type="email" className="h-11" {...loginForm.register("email")} aria-invalid={!!loginForm.formState.errors.email} />
                {loginForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{tv(loginForm.formState.errors.email.message!)}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{tf("password")}</Label>
                <Input id="password" type="password" className="h-11" {...loginForm.register("password")} aria-invalid={!!loginForm.formState.errors.password} />
                {loginForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{tv(loginForm.formState.errors.password.message!)}</p>
                )}
                <div className="flex justify-end">
                  <ForgotPasswordLink email={loginForm.watch("email")} />
                </div>
              </div>
              <Button type="submit" className="h-11 w-full rounded-xl font-semibold" disabled={submitting}>
                {submitting ? "..." : t("loginSubmit")}
              </Button>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("name")}</Label>
                <Input id="name" className="h-11" {...registerForm.register("name")} aria-invalid={!!registerForm.formState.errors.name} />
                {registerForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{tv(registerForm.formState.errors.name.message!)}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="remail">{tf("email")}</Label>
                <Input id="remail" type="email" className="h-11" {...registerForm.register("email")} aria-invalid={!!registerForm.formState.errors.email} />
                {registerForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{tv(registerForm.formState.errors.email.message!)}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rpassword">{tf("password")}</Label>
                <Input id="rpassword" type="password" className="h-11" {...registerForm.register("password")} aria-invalid={!!registerForm.formState.errors.password} />
                {registerForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{tv(registerForm.formState.errors.password.message!)}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
                    {...registerForm.register("acceptTerms")}
                    aria-invalid={!!registerForm.formState.errors.acceptTerms}
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
                {registerForm.formState.errors.acceptTerms && (
                  <p className="text-xs text-destructive">{tv("acceptTermsRequired")}</p>
                )}
              </div>
              <Button type="submit" className="h-11 w-full rounded-xl font-semibold" disabled={submitting}>
                {submitting ? "..." : t("registerSubmit")}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground">
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
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center animate-pulse">
            <span className="text-white font-bold">B</span>
          </div>
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}
