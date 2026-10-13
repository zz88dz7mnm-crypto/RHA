import type { Metadata, Viewport } from "next";
import { Aplicacion } from "@/components/Aplicacion";
import { SCRIPT_TEMA } from "@/lib/tema-base";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "RHA", template: "%s · RHA" },
  description: "Tu agenda, tus hábitos y tus recordatorios.",
  appleWebApp: { capable: true, title: "RHA", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f2f3f7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <head>
        {/* Elige claro u oscuro antes de pintar, para que no parpadee. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="font-sans">
        <Aplicacion>{children}</Aplicacion>
      </body>
    </html>
  );
}
