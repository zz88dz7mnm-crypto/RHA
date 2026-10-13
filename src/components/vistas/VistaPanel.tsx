"use client";

import { useState } from "react";
import { minutosPlanificados, resumenDeTareas, textoDuracion } from "@/lib/agenda";
import { fechaCorta, lunesDe, sumarDias } from "@/lib/fechas";
import { adherencia, avanceSemanal, programadoEn, racha, registroDe } from "@/lib/habitos";
import { useDatos } from "@/lib/rha";
import { GraficoBarras } from "../Grafico";
import { Encabezado, Segmentos, Tarjeta, Vacio } from "../ui";

type Periodo = "semana" | "pasada" | "mes";

/** Métricas de RHA. Toda proporción muestra su denominador; las pausas no cuentan como incumplimiento. */
export function VistaPanel() {
  const { hoy, actividades, habitos, pausas, registros, categorias } = useDatos();
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const lunes = lunesDe(hoy);
  const [desde, hasta] =
    periodo === "semana" ? [lunes, sumarDias(lunes, 6)] : periodo === "pasada" ? [sumarDias(lunes, -7), sumarDias(lunes, -1)] : [sumarDias(hoy, -29), hoy];

  const diarios = habitos.filter((h) => h.estado !== "archivado" && h.tipo === "dias");
  const semanales = habitos.filter((h) => h.estado !== "archivado" && h.tipo === "semanal");
  const porHabito = diarios.map((h) => ({ h, a: adherencia(h, registros, pausas, desde, hasta, hoy) })).sort((x, y) => y.a.programados - x.a.programados);
  const total = porHabito.reduce((t, { a }) => ({ c: t.c + a.completados, p: t.p + a.programados, parc: t.parc + a.parciales }), { c: 0, p: 0, parc: 0 });
  const tareas = resumenDeTareas(actividades, desde, hasta, hoy);
  const enPeriodo = actividades.filter((a) => a.fecha >= desde && a.fecha <= hasta);
  const porCategoria = [{ id: null as string | null, nombre: "Sin categoría", color: "#8e8e93" }, ...categorias]
    .map((c) => ({ ...c, minutos: minutosPlanificados(enPeriodo.filter((a) => a.categoriaId === c.id)) }))
    .filter((c) => c.minutos > 0)
    .sort((a, b) => b.minutos - a.minutos);
  const maxMin = Math.max(1, ...porCategoria.map((c) => c.minutos));
  const dias: string[] = [];
  for (let d = desde; d <= hasta && d <= hoy; d = sumarDias(d, 1)) dias.push(d);

  return (
    <>
      <Encabezado titulo="Panel" />
      <div className="mb-4">
        <Segmentos
          etiqueta="Período"
          opciones={[
            ["semana", "Esta semana"],
            ["pasada", "La pasada"],
            ["mes", "30 días"],
          ]}
          valor={periodo}
          onCambiar={setPeriodo}
        />
      </div>
      <p className="mb-4 px-1 text-[14px] text-tinta-suave">
        Del {fechaCorta(desde, hoy)} al {fechaCorta(hasta, hoy)}. Hoy cuenta solo lo que ya marcaste.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Tarjeta>
          <h2 className="text-[17px] font-bold">Hábitos de días fijos</h2>
          {total.p === 0 ? (
            <Vacio titulo="Sin registros" texto="Todavía no hay días programados en este período." />
          ) : (
            <>
              <p className="cifras mt-2 text-[40px] leading-none font-bold tracking-tight">{Math.round((total.c / total.p) * 100)}%</p>
              <p className="cifras mt-1 text-[14px] text-tinta-suave">
                {total.c} de {total.p} días programados{total.parc ? ` · ${total.parc} parciales` : ""}
              </p>
              <ul className="mt-4 grid gap-3">
                {porHabito
                  .filter(({ a }) => a.programados > 0)
                  .map(({ h, a }) => {
                    const color = categorias.find((c) => c.id === h.categoriaId)?.color ?? "var(--color-acento)";
                    return (
                      <li key={h.id}>
                        <div className="flex items-baseline justify-between gap-3 text-[14px]">
                          <span className="min-w-0 truncate">{h.nombre}</span>
                          <span className="cifras shrink-0 font-semibold">
                            {a.completados}/{a.programados}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-tinta/8">
                          <div className="h-full rounded-full" style={{ width: `${(a.completados / a.programados) * 100}%`, background: color }} />
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </>
          )}
        </Tarjeta>

        <div className="grid grid-cols-1 gap-4">
          <Tarjeta>
            <h2 className="text-[17px] font-bold">Actividades</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4">
              {(
                [
                  ["Completadas", tareas.completadas, "text-verde"],
                  ["Pendientes", tareas.pendientes, ""],
                  ["Vencidas", tareas.vencidas, tareas.vencidas ? "text-rojo" : ""],
                  ["Canceladas", tareas.canceladas, "text-tinta-suave"],
                ] as const
              ).map(([t, v, c]) => (
                <div key={t}>
                  <dt className="text-[13px] text-tinta-suave">{t}</dt>
                  <dd className={`cifras text-[26px] font-bold ${c}`}>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[13px] text-tinta-tenue">Tiempo planificado: {textoDuracion(tareas.minutos)} (bloques con horario, no tiempo real).</p>
          </Tarjeta>

          {semanales.length > 0 && periodo !== "mes" && (
            <Tarjeta>
              <h2 className="text-[17px] font-bold">Metas semanales</h2>
              <ul className="mt-3 grid gap-2">
                {semanales.map((h) => {
                  const s = avanceSemanal(h, registros, desde);
                  return (
                    <li key={h.id} className="flex items-baseline justify-between gap-3 text-[15px]">
                      <span className="min-w-0 truncate">{h.nombre}</span>
                      <span className={`cifras shrink-0 font-semibold ${s.cumplida ? "text-verde" : ""}`}>
                        {s.hechas} de {s.meta} {s.cumplida ? "✓" : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Tarjeta>
          )}
        </div>

        {dias.length > 1 && total.p > 0 && (
          <Tarjeta className="md:col-span-2">
            <h2 className="text-[17px] font-bold">Hábitos completados por día</h2>
            <div className="mt-3">
              <GraficoBarras
                nombre="Hábitos completados por día"
                barras={dias.map((d) => {
                  const prog = diarios.filter((h) => programadoEn(h, d, pausas));
                  const hechos = prog.filter((h) => registroDe(registros, h.id, d)?.estado === "completado").length;
                  return { etiqueta: fechaCorta(d, hoy), valor: hechos, detalle: `${hechos} de ${prog.length} programados` };
                })}
                formato={(n) => `${n} completados`}
              />
            </div>
          </Tarjeta>
        )}

        <Tarjeta>
          <h2 className="text-[17px] font-bold">Tiempo planificado por categoría</h2>
          {porCategoria.length === 0 ? (
            <Vacio titulo="Sin bloques con horario" texto="Las actividades con hora de inicio y fin suman acá." />
          ) : (
            <ul className="mt-3 grid gap-3">
              {porCategoria.map((c) => (
                <li key={c.id ?? "sin"}>
                  <div className="flex items-baseline justify-between gap-3 text-[14px]">
                    <span>{c.nombre}</span>
                    <span className="cifras font-semibold">{textoDuracion(c.minutos)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-tinta/8">
                    <div className="h-full rounded-full" style={{ width: `${(c.minutos / maxMin) * 100}%`, background: c.color }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta>
          <h2 className="text-[17px] font-bold">Rachas</h2>
          <p className="mt-1 text-[13px] text-tinta-tenue">Días (o semanas) seguidos cumpliendo. Las pausas no cortan la racha.</p>
          <ul className="mt-3 grid gap-2">
            {habitos
              .filter((h) => h.estado === "activo")
              .map((h) => ({ h, r: racha(h, registros, pausas, hoy) }))
              .sort((a, b) => b.r.valor - a.r.valor)
              .slice(0, 6)
              .map(({ h, r }) => (
                <li key={h.id} className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="min-w-0 truncate">{h.nombre}</span>
                  <span className="cifras shrink-0 font-semibold">
                    {r.valor} {r.unidad}
                  </span>
                </li>
              ))}
          </ul>
        </Tarjeta>
      </div>
    </>
  );
}
