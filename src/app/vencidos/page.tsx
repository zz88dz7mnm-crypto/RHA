import type { Metadata } from "next";
import { VistaVencidos } from "@/components/vistas/VistaVencidos";

export const metadata: Metadata = { title: "Vencidos" };

// Todo se muestra recién en el navegador, después de iniciar sesión: no hay nada que validar del lado del servidor.
export const instant = false;

export default function Pagina() {
  return <VistaVencidos />;
}
