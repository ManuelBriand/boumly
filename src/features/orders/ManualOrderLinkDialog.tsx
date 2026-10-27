"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { Check, Copy, Download, Share2, ShoppingBag, MailCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

export function ManualOrderLinkDialog({
  open,
  onOpenChange,
  link,
  subtotal,
  currency = "eur",
  locale = "fr",
  emailedTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: string;
  subtotal: number;
  currency?: string;
  locale?: string;
  emailedTo?: string | null;
}) {
  const t = useTranslations("manualOrderLink");
  const tc = useTranslations("common");
  const [copied, setCopied] = useState(false);
  const [canShare] = useState(
    () => typeof navigator !== "undefined" && !!navigator.share
  );
  const qrRef = useRef<HTMLDivElement>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success(t("linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyError"));
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ title: t("shareTitle"), url: link });
    } catch {
      // partage annulé — rien à faire
    }
  }

  function handleDownloadQr() {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = "lien-paiement.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { subtotal: formatCurrency(subtotal, currency, locale) })}
          </DialogDescription>
        </DialogHeader>

        {/* Confirmation d'envoi email au client */}
        {emailedTo && (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700">
            <MailCheck className="h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">{t("emailedTo", { email: emailedTo })}</span>
          </div>
        )}

        {/* QR code */}
        <div className="flex justify-center">
          <div ref={qrRef} className="rounded-2xl bg-white p-4 ring-1 ring-border">
            <QRCodeCanvas value={link} size={180} marginSize={2} />
          </div>
        </div>

        {/* Lien + copie */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2.5">
            <p className="truncate font-mono text-xs text-muted-foreground">{link}</p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-white px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{copied ? tc("copied") : tc("copy")}</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex min-w-0 flex-col gap-2">
          {canShare && (
            <button
              type="button"
              onClick={handleShare}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <Share2 className="h-4 w-4" />
              {t("shareLink")}
            </button>
          )}
          <div className="flex min-w-0 gap-2">
            <button
              type="button"
              onClick={handleDownloadQr}
              className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="truncate">{t("qrCode")}</span>
            </button>
            <Link
              href="/dashboard/orders"
              className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <ShoppingBag className="h-4 w-4 shrink-0" />
              <span className="truncate">{t("myOrders")}</span>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
