"use client";

import { useState } from "react";
import { delDia, minutosPlanificados, textoDuracion } from "@/lib/agenda";
import { fechaCorta, lunesDe, sumarDias } from "@/lib/fechas";
import { programadoEn, registroDe } from "@/lib/habitos";
import { useDatos } from "@/lib/rha";
import type { Actividad } from "@/lib/tipos";
import { FormActividad } from "../FormActividad";
import { IconoFlecha, IconoMas } from "../iconos";
import { cx, Encabezado } from "../ui";
import { BotonAgregar } from "./VistaHoy";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Calendario de siete días (lunes a domingo), navegable por semana. */
export function VistaSemana() {
  const { hoy, actividades, habitos, pausas, registros, categorias } = useDatos();
  const [lunes, setLunes] = useState(() => lunesDe(hoy));
  const [form, setForm] = useState<{ actividad: Actividad | null; fecha?: string } | null>(null);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const actual = lunes === lunesDe(hoy);
  const deLaSemana = actividades.filter((a) => a.fecha >= lunes && a.fecha <= dias[6]);

  return (
    <>
      <Encabezado sobre={actual ? "Esta semana" : `Semana del ${fechaCorta(lunes, hoy)}`} titulo="Semana">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLunes((l) => sumarDias(l, -7))}
            aria-label="Semana anterior"
            className="cristal-leve grid size-11 place-items-center rounded-full"
          >
            <IconoFlecha izquierda />
          </button>
          {!actual && (
            <button type="button" onClick={() => setLunes(lunesDe(hoy))} className="cristal-leve h-11 rounded-full px-4 text-[14px] font-semibold">
              Hoy
            </button>
          )}
          <button
            type="button"
            onClick={() => setLunes((l) => sumarDias(l, 7))}
            aria-label="Semana siguiente"
            className="cristal-leve grid size-11 place-items-center rounded-full"
          >
            <IconoFlecha />
          </button>
        </div>
      </Encabezado>

      <p className="mb-4 px-1 text-[14px] text-tinta-suave">
        {fechaCorta(lunes, hoy)} al {fechaCorta(dias[6], hoy)} · {deLaSemana.filter((a) => a.estado !== "cancelada").length} actividades
        {minutosPlanificados(deLaSemana) > 0 ? ` · ${textoDuracion(minutosPlanificados(deLaSemana))} planificadas` : ""}
      </p>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-7 lg:gap-2">
        {dias.map((fecha, i) => {
          const lista = delDia(actividades, fecha);
          const diarios = habitos.filter((h) => h.estado !== "archivado" && h.tipo === "dias" && programadoEn(h, fecha, pausas));
          const hechos = diarios.filter((h) => registroDe(registros, h.id, fecha)?.estado === "completado").length;
          const esHoy = fecha === hoy;
          return (
            <section
              key={fecha}
              aria-label={`${DIAS[i]} ${fechaCorta(fecha, hoy)}`}
              className={cx("cristal min-w-0 rounded-[22px] p-3 lg:min-h-64", esHoy && "ring-2 ring-acento")}
            >
              <header className="flex items-center justify-between gap-2 lg:flex-col lg:items-start">
                <p className="flex items-baseline gap-2">
                  <span className={cx("text-[13px] font-semibold uppercase", esHoy ? "text-acento" : "text-tinta-suave")}>{DIAS[i]}</span>
                  <span className={cx("cifras text-[22px] font-bold", esHoy && "text-acento")}>{Number(fecha.slice(8))}</span>
                </p>
                {diarios.length > 0 &&
                  (fecha <= hoy ? (
                    <span className="cifras text-[12px] text-tinta-tenue">
                      Hábitos {hechos}/{diarios.length}
                    </span>
                  ) : null)}
              </header>
              <ul className="mt-2 grid min-w-0 grid-cols-1 gap-1.5">
                {lista.map((a) => {
                  const cat = categorias.find((c) => c.id === a.categoriaId);
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setForm({ actividad: a })}
                        className="block w-full min-w-0 overflow-hidden rounded-xl px-2.5 py-1.5 text-left"
                        style={{ background: `color-mix(in srgb, ${cat?.color ?? "#8e8e93"} 16%, transparent)` }}
                      >
                        <span
                          className={cx(
                            "line-clamp-2 block text-[14px] leading-snug font-semibold break-words",
                            a.estado === "completada" && "text-tinta-tenue line-through",
                          )}
                        >
                          {a.titulo}
                        </span>
                        <span className="cifras block text-[12px] text-tinta-suave">{a.inicio ? `${a.inicio}${a.fin ? `–${a.fin}` : ""}` : "Sin horario"}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => setForm({ actividad: null, fecha })}
                aria-label={`Agregar el ${DIAS[i]} ${fechaCorta(fecha, hoy)}`}
                className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-xl py-1.5 text-[13px] font-semibold text-tinta-tenue hover:bg-tinta/5"
              >
                <IconoMas className="size-3.5" /> {lista.length === 0 ? "Agregar" : ""}
              </button>
            </section>
          );
        })}
      </div>

      <BotonAgregar onClick={() => setForm({ actividad: null })} />
      <FormActividad abierta={!!form} actividad={form?.actividad} fecha={form?.fecha} onCerrar={() => setForm(null)} />
    </>
  );
}
