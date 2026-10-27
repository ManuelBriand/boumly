import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductById } from "@/services/product.service";
import { getStoreBySlug } from "@/services/store.service";
import { getExhibitorEvents } from "@/lib/event-server";
import { currencyForCountry } from "@/lib/countries";
import { truncate } from "@/lib/utils";
import { JsonLd } from "@/components/seo/JsonLd";
import { ProductDetailClient } from "./product-detail-client";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boumly.com";

interface Props {
  params: Promise<{ slug: string; productId: string; locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, productId, locale } = await params;
  const [product, store] = await Promise.all([
    getProductById(productId),
    getStoreBySlug(slug),
  ]);

  if (!product) {
    return { title: "Boumly", robots: { index: false } };
  }

  const images = product.images?.length
    ? product.images
    : product.imageUrl
    ? [product.imageUrl]
    : [];
  const title = store ? `${product.name} — ${store.name}` : product.name;
  const description = truncate(product.description || product.name);

  return {
    title,
    description,
    alternates: { canonical: `/${locale}/store/${slug}/products/${productId}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/${locale}/store/${slug}/products/${productId}`,
      images,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug, productId, locale } = await params;
  const [product, store] = await Promise.all([
    getProductById(productId),
    getStoreBySlug(slug),
  ]);

  if (!product) notFound();

  const exhibitorEvents = store ? await getExhibitorEvents(store.id) : [];

  const images = product.images?.length
    ? product.images
    : product.imageUrl
    ? [product.imageUrl]
    : [];
  const inStock = product.trackStock ? (product.stock ?? 0) > 0 : true;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.name,
    ...(images.length ? { image: images } : {}),
    ...(store ? { brand: { "@type": "Brand", name: store.name } } : {}),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: currencyForCountry(store?.country).toUpperCase(),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${BASE}/${locale}/store/${slug}/products/${productId}`,
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <ProductDetailClient
        product={product}
        store={store}
        slug={slug}
        exhibitorEvents={exhibitorEvents}
      />
    </>
  );
}
