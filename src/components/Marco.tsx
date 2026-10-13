"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { vencidas } from "@/lib/agenda";
import { useDatos } from "@/lib/rha";
import { useServiceWorker } from "./Notificaciones";
import { IconoAgenda, IconoAjustes, IconoHabitos, IconoHoy, IconoPanel, IconoSemana, IconoVencidos, Logo } from "./iconos";
import { cx } from "./ui";

const SECCIONES = [
  { ruta: "/", nombre: "Hoy", Icono: IconoHoy, movil: true },
  { ruta: "/semana", nombre: "Semana", Icono: IconoSemana, movil: true },
  { ruta: "/agenda", nombre: "Agenda", Icono: IconoAgenda, movil: true },
  { ruta: "/habitos", nombre: "Hábitos", Icono: IconoHabitos, movil: true },
  { ruta: "/panel", nombre: "Panel", Icono: IconoPanel, movil: true },
  { ruta: "/vencidos", nombre: "Vencidos", Icono: IconoVencidos, movil: false },
  { ruta: "/ajustes", nombre: "Ajustes", Icono: IconoAjustes, movil: false },
];

/** Barra lateral en la compu, barra inferior en el celular. Vencidos y Ajustes se abren desde Hoy en el celular. */
export function Marco({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  useServiceWorker();
  const { actividades, hoy, pendientes, reintentar } = useDatos();
  const cantidadVencidas = vencidas(actividades, hoy).length;
  const activa = (r: string) => (r === "/" ? ruta === "/" : ruta.startsWith(r));

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl">
      <nav aria-label="Secciones" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 px-4 py-6 lg:flex">
        <Link href="/" className="mb-6 flex items-center gap-3 px-3">
          <Logo className="size-10" />
          <span className="text-[20px] font-bold tracking-tight">RHA</span>
        </Link>
        {SECCIONES.map(({ ruta: r, nombre, Icono }) => (
          <Link
            key={r}
            href={r}
            aria-current={activa(r) ? "page" : undefined}
            className={cx(
              "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors",
              activa(r) ? "bg-acento-suave text-acento" : "text-tinta-suave hover:bg-tinta/5",
            )}
          >
            <Icono className="size-5" />
            {nombre}
            {r === "/vencidos" && cantidadVencidas > 0 && (
              <span className="ml-auto rounded-full bg-rojo px-2 py-0.5 text-[12px] text-white" aria-label={`${cantidadVencidas} vencidas`}>
                {cantidadVencidas}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-3xl px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-36 lg:max-w-5xl lg:px-8 lg:pt-8 lg:pb-16">
          {pendientes > 0 && (
            <div role="status" className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-rojo/10 px-4 py-3 text-[14px] text-rojo">
              <span>{pendientes === 1 ? "Hay 1 cambio sin guardar" : `Hay ${pendientes} cambios sin guardar`}. Se reintenta solo al volver la conexión.</span>
              <button type="button" onClick={reintentar} className="shrink-0 rounded-full bg-rojo px-3 py-1.5 font-semibold text-white">
                Reintentar
              </button>
            </div>
          )}
          {children}
        </main>
      </div>

      <nav
        aria-label="Secciones"
        className="cristal fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-30 flex rounded-[26px] px-1 py-1 lg:hidden"
      >
        {SECCIONES.filter((s) => s.movil).map(({ ruta: r, nombre, Icono }) => (
          <Link
            key={r}
            href={r}
            aria-current={activa(r) ? "page" : undefined}
            className={cx(
              "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[11px] font-semibold transition-colors",
              activa(r) ? "text-acento" : "text-tinta-tenue",
            )}
          >
            <Icono className="size-6" />
            {nombre}
          </Link>
        ))}
      </nav>
    </div>
  );
}
