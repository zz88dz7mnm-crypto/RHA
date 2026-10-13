"use client";

import { useState } from "react";
import { propuesta, vencidas } from "@/lib/agenda";
import { fechaRelativa } from "@/lib/fechas";
import { useDatos } from "@/lib/rha";
import type { Actividad } from "@/lib/tipos";
import { FormActividad } from "../FormActividad";
import { FilaActividad } from "../Piezas";
import { Encabezado, Tarjeta, Vacio } from "../ui";

/**
 * Tareas que no se hicieron y cuya fecha pasó. No se mueven solas: se propone un día
 * y el usuario decide (moverla, completarla o cancelarla).
 */
export function VistaVencidos() {
  const { hoy, actividades, guardarActividades } = useDatos();
  const [form, setForm] = useState<Actividad | null>(null);
  const lista = vencidas(actividades, hoy);

  return (
    <>
      <Encabezado titulo="Vencidos" />
      {lista.length === 0 ? (
        <Tarjeta>
          <Vacio titulo="Nada vencido" texto="Todo lo que tenía fecha pasada está hecho o decidido." />
        </Tarjeta>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <p className="px-1 text-[15px] text-tinta-suave">Estas quedaron pendientes. Te propongo un día para cada una; vos decidís.</p>
          {lista.map((a) => {
            const { fecha } = propuesta(a, actividades, hoy);
            return (
              <Tarjeta key={a.id} className="p-4">
                <ul>
                  <FilaActividad actividad={a} mostrarFecha={`Era para ${fechaRelativa(a.fecha, hoy).toLowerCase()}`} onAbrir={() => setForm(a)} />
                </ul>
                <div className="mt-1 flex flex-wrap gap-2 pl-10">
                  <button
                    type="button"
                    onClick={() => guardarActividades([{ ...a, fecha }])}
                    className="h-9 rounded-full bg-acento px-3.5 text-[14px] font-semibold text-sobre-acento"
                  >
                    Pasar a {fechaRelativa(fecha, hoy).toLowerCase()}
                    {a.inicio ? ` ${a.inicio}` : ""}
                  </button>
                  <button type="button" onClick={() => setForm(a)} className="cristal-leve h-9 rounded-full px-3.5 text-[14px] font-semibold">
                    Otro día
                  </button>
                  <button
                    type="button"
                    onClick={() => guardarActividades([{ ...a, estado: "completada" }])}
                    className="cristal-leve h-9 rounded-full px-3.5 text-[14px] font-semibold"
                  >
                    Ya la hice
                  </button>
                  <button
                    type="button"
                    onClick={() => guardarActividades([{ ...a, estado: "cancelada" }])}
                    className="h-9 rounded-full px-3.5 text-[14px] font-semibold text-tinta-suave"
                  >
                    Ya no va
                  </button>
                </div>
              </Tarjeta>
            );
          })}
        </div>
      )}
      <FormActividad abierta={!!form} actividad={form} onCerrar={() => setForm(null)} />
    </>
  );
}
