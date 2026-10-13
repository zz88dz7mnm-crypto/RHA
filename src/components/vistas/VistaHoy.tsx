"use client";

import Link from "next/link";
import { useState } from "react";
import { delDia, minutosPlanificados, textoDuracion, vencidas } from "@/lib/agenda";
import { fechaRelativa, sumarDias } from "@/lib/fechas";
import { programadoEn, registroDe } from "@/lib/habitos";
import { useDatos } from "@/lib/rha";
import type { Actividad } from "@/lib/tipos";
import { ElegirSugeridos } from "../FormHabito";
import { FormActividad } from "../FormActividad";
import { IconoAjustes, IconoFlecha, IconoMas, IconoVencidos } from "../iconos";
import { Anillo, FilaActividad, FilaHabito } from "../Piezas";
import { Boton, Tarjeta } from "../ui";

export function fechaLarga(fecha: string): string {
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${fecha}T12:00:00Z`));
}

/** Botón flotante para agregar, sobre la barra de navegación. */
export function BotonAgregar({ onClick, texto = "Agregar actividad" }: { onClick: () => void; texto?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={texto}
      className="fixed right-5 bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+5.25rem)] z-20 grid size-14 place-items-center rounded-full bg-acento text-sobre-acento shadow-lg shadow-acento/30 active:scale-95 lg:right-10 lg:bottom-10"
    >
      <IconoMas className="size-6" />
    </button>
  );
}

export function VistaHoy() {
  const { hoy, actividades, habitos, pausas, registros } = useDatos();
  const [form, setForm] = useState<{ actividad: Actividad | null } | null>(null);
  const [sugeridos, setSugeridos] = useState(false);

  const deHoy = delDia(actividades, hoy);
  const conHora = deHoy.filter((a) => a.inicio);
  const sinHora = deHoy.filter((a) => !a.inicio);
  const hechas = deHoy.filter((a) => a.estado === "completada").length;
  const atrasadas = vencidas(actividades, hoy);
  const habitosHoy = habitos.filter((h) => h.estado === "activo" && programadoEn(h, hoy, pausas));
  const diarios = habitosHoy.filter((h) => h.tipo === "dias");
  const completados = diarios.filter((h) => registroDe(registros, h.id, hoy)?.estado === "completado").length;
  const proximas = actividades
    .filter((a) => a.estado === "pendiente" && a.fecha > hoy && a.fecha <= sumarDias(hoy, 3))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.inicio ?? "99").localeCompare(b.inicio ?? "99"))
    .slice(0, 5);

  return (
    <>
      <header className="flex items-end justify-between gap-3 px-1 pt-2 pb-4">
        <div>
          <p className="text-[15px] font-semibold text-tinta-suave first-letter:uppercase">{fechaLarga(hoy)}</p>
          <h1 className="text-[34px] leading-tight font-bold tracking-[-0.025em]">Hoy</h1>
        </div>
        <Link href="/ajustes" aria-label="Ajustes" className="cristal-leve grid size-11 place-items-center rounded-full text-tinta-suave lg:hidden">
          <IconoAjustes className="size-5" />
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-4">
        <Tarjeta className="flex items-center gap-5">
          <Anillo valor={completados} total={diarios.length} tam={88} grosor={11}>
            <Anillo valor={hechas} total={deHoy.length} tam={58} grosor={11} color="var(--color-agua)" />
          </Anillo>
          <dl className="grid min-w-0 gap-2">
            <div>
              <dt className="text-[13px] font-semibold text-acento">Hábitos</dt>
              <dd className="cifras text-[22px] leading-tight font-bold">
                {completados}
                <span className="text-[15px] font-semibold text-tinta-tenue">/{diarios.length}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[13px] font-semibold text-agua">Actividades</dt>
              <dd className="cifras text-[22px] leading-tight font-bold">
                {hechas}
                <span className="text-[15px] font-semibold text-tinta-tenue">/{deHoy.length}</span>
                {minutosPlanificados(deHoy) > 0 && (
                  <span className="ml-2 text-[13px] font-medium text-tinta-suave">{textoDuracion(minutosPlanificados(deHoy))} planificadas</span>
                )}
              </dd>
            </div>
          </dl>
        </Tarjeta>

        {atrasadas.length > 0 && (
          <Link href="/vencidos" className="flex items-center gap-3 rounded-[22px] bg-rojo/10 px-5 py-4 text-rojo">
            <IconoVencidos className="size-6 shrink-0" />
            <span className="flex-1 text-[15px] font-semibold">
              {atrasadas.length === 1 ? "1 tarea vencida" : `${atrasadas.length} tareas vencidas`}: decidí qué hacer con{" "}
              {atrasadas.length === 1 ? "ella" : "ellas"}
            </span>
            <IconoFlecha />
          </Link>
        )}

        <Tarjeta>
          <h2 className="text-[20px] font-bold">Agenda</h2>
          {deHoy.length === 0 ? (
            <p className="mt-2 text-[15px] text-tinta-suave">Nada anotado para hoy.</p>
          ) : (
            <>
              {conHora.length > 0 && (
                <ul className="mt-3 grid gap-1">
                  {conHora.map((a) => (
                    <FilaActividad key={a.id} actividad={a} onAbrir={() => setForm({ actividad: a })} />
                  ))}
                </ul>
              )}
              {sinHora.length > 0 && (
                <>
                  <h3 className="mt-3 mb-2 text-[13px] font-semibold tracking-wide text-tinta-tenue uppercase">Sin horario</h3>
                  <ul className="grid gap-1">
                    {sinHora.map((a) => (
                      <FilaActividad key={a.id} actividad={a} onAbrir={() => setForm({ actividad: a })} />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
          <button type="button" onClick={() => setForm({ actividad: null })} className="mt-2 flex items-center gap-2 text-[15px] font-semibold text-acento">
            <IconoMas className="size-4" /> Agregar
          </button>
        </Tarjeta>

        <Tarjeta>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[20px] font-bold">Hábitos</h2>
            <Link href="/habitos" className="text-[15px] font-semibold text-acento">
              Ver todos
            </Link>
          </div>
          {habitos.length === 0 ? (
            <div className="mt-3 grid gap-3">
              <p className="text-[15px] text-tinta-suave">Todavía no tenés hábitos. Armé una lista con lo que contaste de tu rutina para que elijas.</p>
              <Boton onClick={() => setSugeridos(true)}>Elegir mis hábitos</Boton>
            </div>
          ) : habitosHoy.length === 0 ? (
            <p className="mt-2 text-[15px] text-tinta-suave">Hoy no toca ningún hábito.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {habitosHoy.map((h) => (
                <FilaHabito key={h.id} habito={h} fecha={hoy} />
              ))}
            </ul>
          )}
        </Tarjeta>

        {proximas.length > 0 && (
          <Tarjeta>
            <h2 className="text-[20px] font-bold">Próximos días</h2>
            <ul className="mt-3 grid gap-1">
              {proximas.map((a) => (
                <FilaActividad key={a.id} actividad={a} mostrarFecha={fechaRelativa(a.fecha, hoy)} onAbrir={() => setForm({ actividad: a })} />
              ))}
            </ul>
          </Tarjeta>
        )}
      </div>

      <BotonAgregar onClick={() => setForm({ actividad: null })} />
      <FormActividad abierta={!!form} actividad={form?.actividad} onCerrar={() => setForm(null)} />
      <ElegirSugeridos abierta={sugeridos} onCerrar={() => setSugeridos(false)} />
    </>
  );
}
