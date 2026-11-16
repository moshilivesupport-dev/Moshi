
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Moshi - Live Shopping",
    short_name: "Moshi",
    description: "Découvre, partage et achète en direct sur Moshi.",
    start_url: "/",
    display: "standalone",
    background_color: "#F9FAFB",
    theme_color: "#9D7BEA",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
