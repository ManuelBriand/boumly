import { Globe } from "lucide-react";
import type { SocialPlatform } from "@/types";

type IconProps = { className?: string };

function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.5 3a5.6 5.6 0 0 0 4.5 4.5v3a8.6 8.6 0 0 1-4.5-1.3v6.3a6.5 6.5 0 1 1-6.5-6.5c.3 0 .6 0 .9.1v3.2a3.3 3.3 0 1 0 2.3 3.2V3h3.3Z" />
    </svg>
  );
}

function FacebookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20Zm4.5-6c-.2-.1-1.4-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5 0a6.5 6.5 0 0 1-1.9-1.2 7.2 7.2 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4c.1-.2.2-.3.2-.5s0-.3 0-.4-.6-1.4-.8-1.9-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c.6.3 1.1.4 1.5.5a3.6 3.6 0 0 0 1.6.1c.5-.1 1.4-.6 1.6-1.1s.2-1 .1-1.1-.2-.2-.5-.3Z" />
    </svg>
  );
}

export interface SocialPlatformConfig {
  key: SocialPlatform;
  label: string;
  placeholder: string;
  icon: (props: IconProps) => React.ReactNode;
}

export const SOCIAL_PLATFORMS: SocialPlatformConfig[] = [
  { key: "instagram", label: "Instagram", placeholder: "@maboutique", icon: InstagramIcon },
  { key: "tiktok", label: "TikTok", placeholder: "@maboutique", icon: TikTokIcon },
  { key: "facebook", label: "Facebook", placeholder: "maboutique", icon: FacebookIcon },
  { key: "whatsapp", label: "WhatsApp", placeholder: "+33 6 12 34 56 78", icon: WhatsAppIcon },
  { key: "website", label: "Site web", placeholder: "maboutique.com", icon: Globe },
];

/** Convertit un handle/numéro/URL saisi en URL cliquable. "" si vide. */
export function buildSocialUrl(platform: SocialPlatform, raw?: string): string {
  const v = raw?.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, "").trim();
  switch (platform) {
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "tiktok":
      return `https://tiktok.com/@${handle}`;
    case "facebook":
      return `https://facebook.com/${handle}`;
    case "whatsapp":
      return `https://wa.me/${v.replace(/[^\d]/g, "")}`;
    case "website":
      return `https://${v.replace(/^\/+/, "")}`;
    default:
      return v;
  }
}
