import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { getEventByInviteCodeServer } from "@/lib/event-server";

interface Props {
  params: Promise<{ inviteCode: string; locale: string }>;
}

// Redirige le lien d'invitation court vers la page d'inscription du marché.
export default async function JoinPage({ params }: Props) {
  const { inviteCode, locale } = await params;
  const event = await getEventByInviteCodeServer(inviteCode);
  if (!event || event.status !== "published") notFound();

  redirect({ href: `/event/${event.slug}/register`, locale });
}
