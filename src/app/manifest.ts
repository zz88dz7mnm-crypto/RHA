import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RHA",
    short_name: "RHA",
    description: "Tu agenda, tus hábitos y tus recordatorios.",
    lang: "es-AR",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f2f3f7",
    theme_color: "#f2f3f7",
    icons: [
      { src: "/iconos/rha-192.png", sizes: "192x192", type: "image/png" },
      { src: "/iconos/rha-512.png", sizes: "512x512", type: "image/png" },
      { src: "/iconos/rha-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
