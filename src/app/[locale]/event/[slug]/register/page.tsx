import { notFound } from "next/navigation";
import { getEventBySlugServer } from "@/lib/event-server";
import { RegisterClient } from "./register-client";

interface Props {
  params: Promise<{ slug: string; locale: string }>;
}

// Page d'inscription artisan. Server Component : charge le marché publié puis
// délègue au client (auth, formulaire, paiement). On ne passe que des données
// sérialisables (pas de Timestamp Firestore).
export default async function EventRegisterPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlugServer(slug);
  if (!event || event.status !== "published") notFound();

  const data = {
    id: event.id,
    slug: event.slug,
    name: event.name,
    description: event.description,
    photoUrl: event.photoUrl,
    country: event.country,
    currency: event.currency,
    registrationOpen: event.registrationOpen,
    pricing: {
      type: event.pricing.type,
      ...(event.pricing.fixedPrice != null && { fixedPrice: event.pricing.fixedPrice }),
      ...(event.pricing.categories && { categories: event.pricing.categories }),
    },
  };

  return <RegisterClient event={data} />;
}
