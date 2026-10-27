import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Boumly",
    short_name: "Boumly",
    description: "Boutique en ligne pour artisans et créateurs locaux",
    start_url: "/fr",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#FF4D6D",
    icons: [
      {
        src: "/icon.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
