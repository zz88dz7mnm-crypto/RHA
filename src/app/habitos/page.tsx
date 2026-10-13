import type { Metadata } from "next";
import { VistaHabitos } from "@/components/vistas/VistaHabitos";

export const metadata: Metadata = { title: "Hábitos" };

// Todo se muestra recién en el navegador, después de iniciar sesión: no hay nada que validar del lado del servidor.
export const instant = false;

export default function Pagina() {
  return <VistaHabitos />;
}
