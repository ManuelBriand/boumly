"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getStoreBySlug } from "@/services/store.service";
import { DEFAULT_CANCELLATION_POLICY } from "@/lib/cancellation-policy";
import type { Store } from "@/types";

export default function CancellationPolicyPage() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getStoreBySlug(slug)
      .then(setStore)
      .finally(() => setLoaded(true));
  }, [slug]);

  const policy = store?.cancellationPolicy?.trim() || DEFAULT_CANCELLATION_POLICY;

  return (
    <div className="bg-white min-h-screen">
      <header className="border-b border-border py-5 px-6">
        <div className="max-w-2xl mx-auto">
          <Link
            href={`/store/${slug}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {store?.name ?? "Boutique"}
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12 md:py-16">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          Conditions d&apos;annulation
        </h1>
        {store?.name && (
          <p className="mt-2 text-sm text-muted-foreground">{store.name}</p>
        )}

        {loaded && (
          <p className="mt-8 text-foreground leading-relaxed whitespace-pre-line">
            {policy}
          </p>
        )}
      </main>
    </div>
  );
}
