"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  motion,
  useInView,
  AnimatePresence,
} from "framer-motion";
import {
  Zap,
  Package,
  Smartphone,
  ShoppingCart,
  Share2,
  CreditCard,
  ArrowRight,
  Check,
  Star,
  ChevronRight,
  ShoppingBag,
  BarChart3,
  Menu,
  X,
  Send,
  Loader2,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

// ─── Animation Variants ────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return scrolled;
}

// ─── Navbar ────────────────────────────────────────────────────────
function Navbar() {
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useTranslations("landing.nav");

  const navLinks = [
    { label: t("features"), href: "#features" },
    { label: t("pricing"), href: "#pricing" },
    { label: t("contact"), href: "#contact" },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/90 backdrop-blur-xl border-b border-[#E5E7EB] shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#FF4D6D] rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <span className="font-bold text-[#111827] text-lg tracking-tight">Boumly</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors font-medium"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="text-sm font-medium text-[#111827] hover:text-[#FF4D6D] transition-colors"
          >
            {t("login")}
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 bg-[#FF4D6D] text-white text-sm font-semibold rounded-xl hover:bg-[#e63d5c] transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            {t("cta")} →
          </Link>
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-[#E5E7EB] overflow-hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {navLinks.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="text-sm font-medium text-[#6B7280]"
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </a>
              ))}
              <LanguageSwitcher />
              <Link
                href="/register"
                className="w-full text-center py-3 bg-[#FF4D6D] text-white text-sm font-semibold rounded-xl"
                onClick={() => setMenuOpen(false)}
              >
                {t("ctaShort")}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

// ─── Floating Notification Card ────────────────────────────────────
function FloatingCard({
  icon,
  label,
  sub,
  color,
  delay,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  color: string;
  delay: number;
  className: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      className={`absolute bg-white rounded-2xl shadow-xl border border-[#E5E7EB] px-4 py-3 flex items-center gap-3 ${className}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-[#111827] whitespace-nowrap">{label}</div>
        {sub && <div className="text-[11px] text-[#6B7280] whitespace-nowrap">{sub}</div>}
      </div>
    </motion.div>
  );
}

// ─── Dashboard Mockup ──────────────────────────────────────────────
function DashboardMockup() {
  const t = useTranslations("landing.mockup");
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="bg-[#F9FAFB] rounded-2xl border border-[#E5E7EB] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-[#E5E7EB]">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          <div className="flex-1 mx-3 h-6 bg-[#F3F4F6] rounded-lg flex items-center px-3">
            <span className="text-[10px] text-[#9CA3AF]">app.boumly.com/dashboard</span>
          </div>
        </div>

        <div className="flex h-72">
          <div className="w-44 bg-white border-r border-[#E5E7EB] flex flex-col py-3 px-3 gap-1">
            <div className="flex items-center gap-2 px-2 py-2 mb-2">
              <div className="w-6 h-6 bg-[#FF4D6D] rounded-lg" />
              <span className="text-xs font-bold text-[#111827]">{t("store")}</span>
            </div>
            {[
              { icon: BarChart3, label: t("dashboard"), active: true },
              { icon: Package, label: t("products") },
              { icon: ShoppingCart, label: t("orders") },
              { icon: Share2, label: t("share") },
            ].map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-[#FFF1F4] text-[#FF4D6D]"
                    : "text-[#6B7280] hover:bg-[#F9FAFB]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
            ))}
          </div>

          <div className="flex-1 p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-[#111827]">{t("dashboard")}</div>
                <div className="text-[10px] text-[#6B7280]">{t("welcomeBack")}</div>
              </div>
              <div className="text-[10px] bg-[#FFF1F4] text-[#FF4D6D] font-semibold px-2 py-1 rounded-lg">
                {t("online")}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: t("revenue"), value: "1 248€", trend: "+18%" },
                { label: t("orders"), value: "34", trend: "+7%" },
                { label: t("products"), value: "12", trend: "" },
              ].map(({ label, value, trend }) => (
                <div key={label} className="bg-white rounded-xl border border-[#E5E7EB] p-2.5">
                  <div className="text-[10px] text-[#6B7280] mb-1">{label}</div>
                  <div className="text-sm font-bold text-[#111827]">{value}</div>
                  {trend && (
                    <div className="text-[9px] text-[#22C55E] font-semibold">{trend}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-[#E5E7EB] p-2.5">
              <div className="text-[10px] font-semibold text-[#111827] mb-2">{t("latestOrders")}</div>
              {[
                { name: "Marie D.", product: t("order1Product"), amount: "24,99€", status: t("statusNew"), isNew: true },
                { name: "Lucas M.", product: t("order2Product"), amount: "18,50€", status: t("statusDelivered"), isNew: false },
              ].map(({ name, product, amount, status, isNew }) => (
                <div
                  key={name}
                  className="flex items-center justify-between py-1.5 border-b border-[#F3F4F6] last:border-0"
                >
                  <div>
                    <div className="text-[9px] font-semibold text-[#111827]">{name}</div>
                    <div className="text-[9px] text-[#6B7280]">{product}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-[#111827]">{amount}</span>
                    <span
                      className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${
                        isNew
                          ? "bg-[#FFF1F4] text-[#FF4D6D]"
                          : "bg-[#F0FDF4] text-[#22C55E]"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section Wrapper ───────────────────────────────────────────────
function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section
      id={id}
      ref={ref}
      variants={stagger}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={`py-24 px-6 ${className}`}
    >
      {children}
    </motion.section>
  );
}

// ─── Feature Card ──────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group bg-white rounded-2xl border border-[#E5E7EB] p-6 hover:shadow-lg transition-all duration-300 hover:border-[#FF4D6D]/20"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${gradient}`}>
        <Icon className="w-5 h-5 text-[#FF4D6D]" />
      </div>
      <h3 className="font-semibold text-[#111827] mb-2 text-base">{title}</h3>
      <p className="text-sm text-[#6B7280] leading-relaxed">{description}</p>
    </motion.div>
  );
}

// ─── Testimonial Card ──────────────────────────────────────────────
function TestimonialCard({
  quote,
  name,
  role,
  avatar,
}: {
  quote: string;
  name: string;
  role: string;
  avatar: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="bg-white rounded-2xl border border-[#E5E7EB] p-6 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex gap-0.5 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-[#FF4D6D] text-[#FF4D6D]" />
        ))}
      </div>
      <p className="text-[#111827] text-sm leading-relaxed mb-5">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF4D6D] to-[#FF8FA3] flex items-center justify-center text-white font-bold text-sm">
          {avatar}
        </div>
        <div>
          <div className="text-sm font-semibold text-[#111827]">{name}</div>
          <div className="text-xs text-[#6B7280]">{role}</div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Contact Section ───────────────────────────────────────────────
function ContactSection() {
  const t = useTranslations("landing.contact");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("success");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#FF4D6D] focus:outline-none focus:ring-2 focus:ring-[#FF4D6D]/15 transition-all";

  return (
    <Section id="contact" className="max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-[#FFF1F4] text-[#FF4D6D] text-sm font-semibold px-4 py-2 rounded-full mb-4">
          <Send className="w-4 h-4" />
          {t("badge")}
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold text-[#111827] tracking-tight mb-4">
          {t("title")}
        </motion.h2>
        <motion.p variants={fadeUp} className="text-lg text-[#6B7280] max-w-xl mx-auto">
          {t("subtitle")}
        </motion.p>
      </div>

      <motion.form
        variants={fadeUp}
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-[#E5E7EB] shadow-sm p-8 flex flex-col gap-5"
      >
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-name" className="text-sm font-medium text-[#111827]">
              {t("nameLabel")}
            </label>
            <input
              id="contact-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="contact-email" className="text-sm font-medium text-[#111827]">
              {t("emailLabel")}
            </label>
            <input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-message" className="text-sm font-medium text-[#111827]">
            {t("messageLabel")}
          </label>
          <textarea
            id="contact-message"
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("messagePlaceholder")}
            className={`${inputClass} resize-none`}
          />
        </div>

        <button
          type="submit"
          disabled={status === "sending"}
          className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#FF4D6D] text-white font-semibold rounded-2xl hover:bg-[#e63d5c] transition-all shadow-lg shadow-[#FF4D6D]/25 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {status === "sending" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("sending")}
            </>
          ) : (
            <>
              {t("submit")}
              <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>

        {status === "success" && (
          <p className="text-sm font-medium text-[#22C55E] text-center">{t("success")}</p>
        )}
        {status === "error" && (
          <p className="text-sm font-medium text-[#EF4444] text-center">{t("error")}</p>
        )}
      </motion.form>
    </Section>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function LandingPage() {
  const { firebaseUser, isCustomer, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations("landing");

  useEffect(() => {
    if (!loading && firebaseUser) {
      router.replace(isCustomer ? "/account" : "/dashboard");
    }
  }, [firebaseUser, isCustomer, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-10 h-10 bg-[#FF4D6D] rounded-2xl flex items-center justify-center animate-pulse">
          <span className="text-white font-bold">B</span>
        </div>
      </div>
    );
  }

  if (firebaseUser) return null;

  const conceptSteps = t.raw("concept.steps") as { title: string; desc: string }[];
  const featureItems = t.raw("features.items") as { title: string; description: string }[];
  const featureMeta = [
    { icon: Zap, gradient: "bg-[#FFF1F4]" },
    { icon: Package, gradient: "bg-[#EEF2FF]" },
    { icon: Smartphone, gradient: "bg-[#F0FDF4]" },
    { icon: ShoppingCart, gradient: "bg-[#FFF7ED]" },
    { icon: Share2, gradient: "bg-[#F5F3FF]" },
    { icon: CreditCard, gradient: "bg-[#FFF1F4]" },
  ];
  const whyRows = t.raw("why.rows") as { traditional: string; boumly: string }[];
  const testimonials = t.raw("testimonials.items") as { quote: string; name: string; role: string; avatar: string }[];
  const pricingFeatures = t.raw("pricing.features") as string[];
  const stripeFeeLink = (chunks: ReactNode) => (
    <a
      href="https://stripe.com/pricing"
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-dotted underline-offset-2 hover:text-[#111827] transition-colors"
    >
      {chunks}
    </a>
  );
  const conceptMeta = [
    { icon: "💡", color: "from-[#FFF1F4] to-white", border: "border-[#FF4D6D]/20", highlight: false },
    { icon: "⚡", color: "from-[#F5F3FF] to-white", border: "border-[#8B5CF6]/20", highlight: true },
    { icon: "💰", color: "from-[#F0FDF4] to-white", border: "border-[#22C55E]/20", highlight: false },
  ];
  const footerLinks = [
    { label: t("nav.features"), href: "#features", internal: false },
    { label: t("nav.pricing"), href: "#pricing", internal: false },
    { label: t("nav.contact"), href: "#contact", internal: false },
    { label: t("footer.mentions"), href: "/mentions-legales", internal: true },
    { label: t("footer.privacy"), href: "/politique-confidentialite", internal: true },
    { label: t("footer.cgu"), href: "/cgu", internal: true },
    { label: t("footer.cgv"), href: "/cgv", internal: true },
  ];

  return (
    <div className="bg-white overflow-x-hidden">
      <Navbar />

      {/* ── 1. Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFF1F4] via-white to-white pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FF4D6D]/6 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full px-4 py-2 text-sm text-[#6B7280] mb-8 shadow-sm"
          >
            <span className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse" />
            {t("hero.badge")}
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
            className="text-5xl md:text-7xl font-bold text-[#111827] leading-[1.08] tracking-tight mb-6"
          >
            {t("hero.titleLine1")}
            <br />
            <span className="text-[#FF4D6D]">{t("hero.titleHighlight")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-[#6B7280] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {t("hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-3 justify-center mb-6"
          >
            <Link
              href="/register"
              className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-[#FF4D6D] text-white font-semibold rounded-2xl hover:bg-[#e63d5c] transition-all shadow-lg shadow-[#FF4D6D]/25 hover:shadow-xl hover:shadow-[#FF4D6D]/30 hover:-translate-y-0.5 active:scale-95 text-base"
            >
              {t("hero.cta")}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-[#6B7280]"
          >
            {t("hero.noConfig")}{" "}
            <span className="font-semibold text-[#FF4D6D]">{t("hero.justBoum")}</span>
          </motion.p>
        </div>

        <div className="relative w-full max-w-5xl mx-auto mt-20">
          <FloatingCard
            icon={<Package className="w-4 h-4 text-white" />}
            label={t("hero.card1Label")}
            sub={t("hero.card1Sub")}
            color="bg-[#FF4D6D]"
            delay={0.7}
            className="-top-8 left-4 md:left-8 z-20"
          />
          <FloatingCard
            icon={<Zap className="w-4 h-4 text-white" />}
            label={t("hero.card2Label")}
            sub="boumly.com/maboutique"
            color="bg-[#8B5CF6]"
            delay={0.9}
            className="-top-8 right-4 md:right-8 z-20"
          />
          <FloatingCard
            icon={<ShoppingBag className="w-4 h-4 text-white" />}
            label={t("hero.card3Label")}
            sub={t("hero.card3Sub")}
            color="bg-[#22C55E]"
            delay={1.1}
            className="bottom-16 right-4 md:right-16 z-20"
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          >
            <DashboardMockup />
          </motion.div>
        </div>
      </section>

      {/* ── 2. Problème ─────────────────────────────────────────── */}
      <Section className="max-w-3xl mx-auto">
        <div className="text-center">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-[#FFF1F4] text-[#FF4D6D] text-sm font-semibold px-4 py-2 rounded-full mb-6">
            {t("problem.badge")}
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold text-[#111827] tracking-tight mb-8">
            {t("problem.titleLine1")}
            <br />
            <span className="text-[#FF4D6D]">{t("problem.titleLine2")}</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-[#6B7280] leading-relaxed mb-6">
            {t("problem.body1")}
          </motion.p>
          <motion.p variants={fadeUp} className="text-lg text-[#6B7280] leading-relaxed">
            {t("problem.body2")}
          </motion.p>
        </div>
      </Section>

      {/* ── 3. Concept BOUM ─────────────────────────────────────── */}
      <Section id="features" className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-[#FFF1F4] text-[#FF4D6D] text-sm font-semibold px-4 py-2 rounded-full mb-4">
            <Zap className="w-4 h-4" />
            {t("concept.badge")}
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold text-[#111827] tracking-tight mb-4">
            {t("concept.titleLine1")}
            <br />
            {t("concept.titleLine2")}
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-[#6B7280] max-w-xl mx-auto">
            {t("concept.subtitle")}
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {conceptSteps.map((s, i) => {
            const meta = conceptMeta[i];
            const step = String(i + 1).padStart(2, "0");
            return (
              <motion.div
                key={step}
                variants={fadeUp}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className={`relative bg-gradient-to-b ${meta.color} rounded-3xl border ${meta.border} p-8 text-center ${
                  meta.highlight ? "shadow-xl" : "shadow-sm"
                }`}
              >
                {meta.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF4D6D] text-white text-xs font-bold px-3 py-1 rounded-full">
                    BOUM
                  </div>
                )}
                <div className="text-4xl mb-4">{meta.icon}</div>
                <div className="text-xs font-bold text-[#6B7280] tracking-widest mb-2">{step}</div>
                <h3 className="text-xl font-bold text-[#111827] mb-3">{s.title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* ── 3. Fonctionnalités ──────────────────────────────────── */}
      <Section className="bg-[#F9FAFB] max-w-none">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white border border-[#E5E7EB] text-[#6B7280] text-sm font-semibold px-4 py-2 rounded-full mb-4 shadow-sm">
              {t("features.badge")}
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold text-[#111827] tracking-tight mb-4">
              {t("features.title")}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-[#6B7280] max-w-xl mx-auto">
              {t("features.subtitle")}
            </motion.p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featureItems.map((feature, i) => (
              <FeatureCard
                key={feature.title}
                icon={featureMeta[i].icon}
                gradient={featureMeta[i].gradient}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* ── 5. Avant / Après ────────────────────────────────────── */}
      <Section className="bg-[#F9FAFB] max-w-none">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white border border-[#E5E7EB] text-[#6B7280] text-sm font-semibold px-4 py-2 rounded-full mb-4 shadow-sm">
              {t("why.badge")}
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold text-[#111827] tracking-tight mb-4">
              {t("why.title")}
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-[#6B7280] max-w-xl mx-auto">
              {t("why.subtitle")}
            </motion.p>
          </div>

          <motion.div variants={fadeUp} className="bg-white rounded-3xl border border-[#E5E7EB] overflow-hidden shadow-sm">
            <div className="grid grid-cols-2 bg-[#F9FAFB] border-b border-[#E5E7EB]">
              <div className="px-6 py-4 text-sm font-semibold text-[#6B7280]">
                {t("why.columnTraditional")}
              </div>
              <div className="px-6 py-4 text-sm font-semibold text-[#FF4D6D] border-l border-[#E5E7EB] bg-[#FFF1F4]">
                {t("why.columnBoumly")} ⚡
              </div>
            </div>

            {whyRows.map(({ traditional, boumly }, i) => (
              <div key={traditional} className={`grid grid-cols-2 border-b border-[#E5E7EB] last:border-0 ${i % 2 === 1 ? "bg-[#FAFAFA]" : ""}`}>
                <div className="px-6 py-4 text-sm text-[#6B7280]">
                  <span className="inline-flex items-start gap-1.5">
                    <X className="w-3.5 h-3.5 text-[#EF4444] mt-0.5 flex-shrink-0" />
                    {traditional}
                  </span>
                </div>
                <div className="px-6 py-4 text-sm font-medium text-[#111827] border-l border-[#E5E7EB] bg-[#FFF1F4]/50">
                  <span className="inline-flex items-start gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#22C55E] mt-0.5 flex-shrink-0" />
                    {boumly}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ── 6. Témoignages ──────────────────────────────────────── */}
      <Section className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-[#FFF1F4] text-[#FF4D6D] text-sm font-semibold px-4 py-2 rounded-full mb-4">
            <Star className="w-4 h-4 fill-current" />
            {t("testimonials.badge")}
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold text-[#111827] tracking-tight mb-4">
            {t("testimonials.titleLine1")}
            <br />
            {t("testimonials.titleLine2")}
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((item) => (
            <TestimonialCard key={item.name} {...item} />
          ))}
        </div>
      </Section>

      {/* ── 7. Tarifs ────────────────────────────────────────────── */}
      <Section id="pricing" className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-[#FFF1F4] text-[#FF4D6D] text-sm font-semibold px-4 py-2 rounded-full mb-4">
            <Zap className="w-4 h-4" />
            {t("pricing.badge")}
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-bold text-[#111827] tracking-tight mb-4">
            {t("pricing.titleLine1")}
            <br />
            <span className="text-[#FF4D6D]">{t("pricing.titleHighlight")}</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-lg text-[#6B7280] max-w-xl mx-auto">
            {t.rich("pricing.subtitle", { stripe: stripeFeeLink })}
          </motion.p>
        </div>

        <motion.div variants={fadeUp} className="max-w-md mx-auto">
          <div className="relative bg-white rounded-3xl border-2 border-[#FF4D6D] p-10 text-center shadow-xl shadow-[#FF4D6D]/10">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FF4D6D] text-white text-sm font-bold px-5 py-1.5 rounded-full">
              {t("pricing.planBadge")}
            </div>

            <div className="mt-4 mb-2">
              <span className="text-6xl font-black text-[#111827]">0€</span>
              <span className="text-[#6B7280] text-lg ml-2">{t("pricing.priceSuffix")}</span>
            </div>
            <p className="text-[#6B7280] mb-8 text-sm">
              {t.rich("pricing.commission", { stripe: stripeFeeLink })}
            </p>

            <div className="flex flex-col gap-3 mb-8 text-left">
              {pricingFeatures.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#FFF1F4] flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#FF4D6D]" />
                  </div>
                  <span className="text-sm text-[#111827]">{item}</span>
                </div>
              ))}
            </div>

            <Link
              href="/register"
              className="group w-full flex items-center justify-center gap-2 px-8 py-4 bg-[#FF4D6D] text-white font-semibold rounded-2xl hover:bg-[#e63d5c] transition-all shadow-lg shadow-[#FF4D6D]/25 hover:shadow-xl hover:-translate-y-0.5"
            >
              {t("pricing.cta")}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="mt-4 text-xs text-[#6B7280]">
              {t("pricing.noCard")}
            </p>
          </div>
        </motion.div>
      </Section>

      {/* ── 8. CTA Final ─────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="max-w-4xl mx-auto relative"
        >
          <div className="bg-gradient-to-br from-[#FF4D6D] to-[#FF8FA3] rounded-3xl p-12 md:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-white font-bold text-2xl select-none"
                  style={{
                    left: `${(i % 5) * 22 + 2}%`,
                    top: `${Math.floor(i / 5) * 30 + 10}%`,
                    opacity: 0.3 + (i % 3) * 0.2,
                  }}
                >
                  BOUM
                </div>
              ))}
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-full mb-6">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                {t("finalCta.badge")}
              </div>
              <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">
                {t("finalCta.titleLine1")}
                <br />
                {t("finalCta.titleLine2")}
              </h2>
              <p className="text-lg text-white/80 mb-10 max-w-md mx-auto">
                {t("finalCta.subtitle")}
              </p>
              <Link
                href="/register"
                className="group inline-flex items-center gap-2 px-10 py-4 bg-white text-[#FF4D6D] font-bold rounded-2xl hover:bg-[#FFF1F4] transition-all shadow-xl hover:-translate-y-1 text-lg"
              >
                {t("finalCta.cta")}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="mt-6 text-white/60 text-sm">
                {t("finalCta.noCard")}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── 9. Contact ───────────────────────────────────────────── */}
      <ContactSection />

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-[#E5E7EB] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#FF4D6D] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <span className="font-bold text-[#111827] text-lg tracking-tight">Boumly</span>
            </div>
            <p className="text-sm text-[#6B7280] font-medium">{t("footer.tagline")}</p>
          </div>

          <div className="flex items-center gap-8">
            {footerLinks.map(({ label, href, internal }) =>
              internal ? (
                <Link
                  key={href}
                  href={href}
                  className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors"
                >
                  {label}
                </Link>
              ) : (
                <a
                  key={href}
                  href={href}
                  className="text-sm text-[#6B7280] hover:text-[#111827] transition-colors"
                >
                  {label}
                </a>
              )
            )}
          </div>

          <div className="text-sm text-[#6B7280]">
            {t("footer.copyright")}
          </div>
        </div>
      </footer>
    </div>
  );
}
