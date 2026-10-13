import type { Metadata } from "next";
import { VistaAjustes } from "@/components/vistas/VistaAjustes";

export const metadata: Metadata = { title: "Ajustes" };

// Todo se muestra recién en el navegador, después de iniciar sesión: no hay nada que validar del lado del servidor.
export const instant = false;

export default function Pagina() {
  return <VistaAjustes />;
}
