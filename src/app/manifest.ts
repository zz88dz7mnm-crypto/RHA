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
    background_color: "#090b0f",
    theme_color: "#090b0f",
    icons: [
      { src: "/iconos/rha-192.png", sizes: "192x192", type: "image/png" },
      { src: "/iconos/rha-512.png", sizes: "512x512", type: "image/png" },
      { src: "/iconos/rha-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
