"use client";

import { useState } from "react";
import { ordenar } from "@/lib/agenda";
import { fechaRelativa, sumarDias } from "@/lib/fechas";
import { useDatos } from "@/lib/rha";
import type { Actividad } from "@/lib/tipos";
import { FormActividad } from "../FormActividad";
import { FilaActividad } from "../Piezas";
import { cx, Encabezado, Tarjeta, Vacio } from "../ui";
import { BotonAgregar, fechaLarga } from "./VistaHoy";

/** Lista vertical por fecha y hora, desde hoy. Las tareas sin horario van en su propio bloque de cada día. */
export function VistaAgenda() {
  const { hoy, actividades, categorias } = useDatos();
  const [dias, setDias] = useState(30);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [form, setForm] = useState<Actividad | null | undefined>(undefined);
  const hasta = sumarDias(hoy, dias);
  const lista = ordenar(actividades.filter((a) => a.fecha >= hoy && a.fecha <= hasta && a.estado !== "cancelada" && (!filtro || a.categoriaId === filtro)));
  const porDia = new Map<string, Actividad[]>();
  for (const a of lista) porDia.set(a.fecha, [...(porDia.get(a.fecha) ?? []), a]);
  const masAdelante = actividades.some((a) => a.fecha > hasta && a.estado !== "cancelada");

  return (
    <>
      <Encabezado sobre={`Próximos ${dias} días`} titulo="Agenda" />
      <div className="sin-barra -mx-4 mb-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filtrar por categoría">
        {[{ id: null, nombre: "Todas", color: "var(--color-tinta)" }, ...categorias].map((c) => (
          <button
            key={c.id ?? "todas"}
            type="button"
            aria-pressed={filtro === c.id}
            onClick={() => setFiltro(c.id)}
            className={cx(
              "flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[14px] font-semibold",
              filtro === c.id ? "bg-tinta text-fondo" : "cristal-leve",
            )}
          >
            {c.id && <span className="size-2.5 rounded-full" style={{ background: c.color }} />}
            {c.nombre}
          </button>
        ))}
      </div>

      {porDia.size === 0 ? (
        <Tarjeta>
          <Vacio titulo="Nada por delante" texto="No hay actividades en estos días. Agregá una con el botón +." />
        </Tarjeta>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {[...porDia.entries()].map(([fecha, items]) => {
            const conHora = items.filter((a) => a.inicio);
            const sinHora = items.filter((a) => !a.inicio);
            return (
              <Tarjeta key={fecha}>
                <h2 className="text-[17px] font-bold first-letter:uppercase">
                  {fechaRelativa(fecha, hoy) === "Hoy" || fechaRelativa(fecha, hoy) === "Ayer" ? `${fechaRelativa(fecha, hoy)} · ` : ""}
                  {fechaLarga(fecha)}
                </h2>
                {conHora.length > 0 && (
                  <ul className="mt-3 grid gap-1">
                    {conHora.map((a) => (
                      <FilaActividad key={a.id} actividad={a} onAbrir={() => setForm(a)} />
                    ))}
                  </ul>
                )}
                {sinHora.length > 0 && (
                  <div className={cx("rounded-2xl bg-tinta/[0.04] px-3 pt-2", conHora.length ? "mt-1" : "mt-3")}>
                    <h3 className="mb-2 text-[12px] font-semibold tracking-wide text-tinta-tenue uppercase">Sin horario</h3>
                    <ul className="grid gap-1">
                      {sinHora.map((a) => (
                        <FilaActividad key={a.id} actividad={a} onAbrir={() => setForm(a)} />
                      ))}
                    </ul>
                  </div>
                )}
              </Tarjeta>
            );
          })}
        </div>
      )}
      {masAdelante && (
        <button type="button" onClick={() => setDias((d) => d + 30)} className="mt-4 w-full rounded-full py-3 text-[15px] font-semibold text-acento">
          Ver 30 días más
        </button>
      )}

      <BotonAgregar onClick={() => setForm(null)} />
      <FormActividad abierta={form !== undefined} actividad={form ?? null} onCerrar={() => setForm(undefined)} />
    </>
  );
}
