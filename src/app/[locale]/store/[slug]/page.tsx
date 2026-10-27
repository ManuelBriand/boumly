import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/services/store.service";
import { getActiveProducts } from "@/services/product.service";
import { getExhibitorEvents } from "@/lib/event-server";
import { getActivePrestationsByBoutiqueServer } from "@/lib/booking-server";
import { truncate } from "@/lib/utils";
import { JsonLd } from "@/components/seo/JsonLd";
import { StoreClient } from "./store-client";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boumly.com";

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await params;
  const store = await getStoreBySlug(slug);

  if (!store) {
    return { title: "Boumly", robots: { index: false } };
  }

  const description = truncate(
    store.description || `Découvrez les créations de ${store.name} sur Boumly.`
  );

  return {
    title: store.name,
    description,
    alternates: { canonical: `/${locale}/store/${slug}` },
    openGraph: {
      type: "website",
      title: store.name,
      description,
      url: `/${locale}/store/${slug}`,
      images: store.photoUrl ? [store.photoUrl] : [],
    },
  };
}

export default async function StorePage({ params }: Props) {
  const { slug, locale } = await params;
  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  const [initialProducts, exhibitorEvents, ateliers] = await Promise.all([
    getActiveProducts(store.id),
    getExhibitorEvents(store.id),
    getActivePrestationsByBoutiqueServer(store.id),
  ]);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    description:
      store.description || `Boutique ${store.name} sur Boumly.`,
    url: `${BASE}/${locale}/store/${slug}`,
    ...(store.photoUrl ? { image: store.photoUrl } : {}),
    ...(store.phone ? { telephone: store.phone } : {}),
    ...(store.address ? { address: store.address } : {}),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <StoreClient
        store={store}
        initialProducts={initialProducts}
        slug={slug}
        exhibitorEvents={exhibitorEvents}
        ateliers={ateliers}
      />
    </>
  );
}
