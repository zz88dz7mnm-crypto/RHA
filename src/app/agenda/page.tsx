import type { Metadata } from "next";
import { VistaAgenda } from "@/components/vistas/VistaAgenda";

export const metadata: Metadata = { title: "Agenda" };

// Todo se muestra recién en el navegador, después de iniciar sesión: no hay nada que validar del lado del servidor.
export const instant = false;

export default function Pagina() {
  return <VistaAgenda />;
}
