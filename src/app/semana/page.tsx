import type { Metadata } from "next";
import { VistaSemana } from "@/components/vistas/VistaSemana";

export const metadata: Metadata = { title: "Semana" };

// Todo se muestra recién en el navegador, después de iniciar sesión: no hay nada que validar del lado del servidor.
export const instant = false;

export default function Pagina() {
  return <VistaSemana />;
}
