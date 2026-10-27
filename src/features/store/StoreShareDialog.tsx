"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { Check, Copy, Download, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Store } from "@/types";

export function StoreShareDialog({
  store,
  trigger,
}: {
  store: Store;
  trigger: React.ReactNode;
}) {
  const t = useTranslations("shareDialog");
  const tc = useTranslations("common");
  // URL publique calculée côté client (origin indisponible en SSR). Le contenu du
  // dialog est porté et monté seulement à l'ouverture → pas de mismatch d'hydratation.
  const [url] = useState(() =>
    typeof window !== "undefined"
      ? `${window.location.origin}/store/${store.slug}`
      : ""
  );
  const [canShare] = useState(
    () => typeof navigator !== "undefined" && !!navigator.share
  );
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("linkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyError"));
    }
  }

  async function handleShare() {
    if (!url) return;
    try {
      await navigator.share({ title: store.name, url });
    } catch {
      // partage annulé par l'utilisateur — rien à faire
    }
  }

  function handleDownloadQr() {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `boutique-${store.slug}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <Dialog>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        {/* Identité boutique */}
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-border">
            {store.photoUrl ? (
              <Image
                src={store.photoUrl}
                alt={store.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xl">
                🛍️
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{store.name}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              /store/{store.slug}
            </p>
          </div>
        </div>

        {/* QR code */}
        <div className="flex justify-center">
          <div
            ref={qrRef}
            className="rounded-2xl bg-white p-4 ring-1 ring-border"
          >
            {url ? (
              <QRCodeCanvas value={url} size={200} marginSize={2} />
            ) : (
              <div className="h-[200px] w-[200px] animate-pulse rounded-md bg-muted" />
            )}
          </div>
        </div>

        {/* Lien + copie */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2.5">
            <p className="truncate font-mono text-xs text-muted-foreground">
              {url || "…"}
            </p>
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
        <div className="flex flex-col gap-2">
          {canShare && (
            <button
              type="button"
              onClick={handleShare}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              <Share2 className="h-4 w-4" />
              {tc("share")}
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownloadQr}
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              {t("qrCode")}
            </button>
            <Link
              href={`/store/${store.slug}`}
              target="_blank"
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" />
              {tc("view")}
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
