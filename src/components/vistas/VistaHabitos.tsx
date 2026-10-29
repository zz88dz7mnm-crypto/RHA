"use client";

import { useState } from "react";
import { fechaCorta, sumarDias } from "@/lib/fechas";
import { adherencia, avanceSemanal, programadoEn, racha, registroDe, textoFrecuencia } from "@/lib/habitos";
import { useDatos } from "@/lib/rha";
import type { Habito } from "@/lib/tipos";
import { ElegirSugeridos, FormHabito } from "../FormHabito";
import { IconoLlama, IconoPastilla } from "../iconos";
import { GraficoLinea } from "../Grafico";
import { Anillo, kg } from "../Piezas";
import { Boton, cx, Encabezado, Tarjeta, Vacio } from "../ui";
import { BotonAgregar } from "./VistaHoy";

const INICIALES = ["L", "M", "M", "J", "V", "S", "D"];

export function VistaHabitos() {
  const { habitos } = useDatos();
  const [form, setForm] = useState<Habito | null | undefined>(undefined);
  const [sugeridos, setSugeridos] = useState(false);
  const grupos: [string, Habito[]][] = [
    ["Activos", habitos.filter((h) => h.estado === "activo")],
    ["En pausa", habitos.filter((h) => h.estado === "pausado")],
    ["Archivados", habitos.filter((h) => h.estado === "archivado")],
  ];

  return (
    <>
      <Encabezado titulo="Hábitos" />
      {habitos.length === 0 ? (
        <Tarjeta>
          <Vacio titulo="Todavía no hay hábitos" texto="Elegí de la lista armada con tu rutina o creá uno propio.">
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Boton onClick={() => setSugeridos(true)}>Elegir mis hábitos</Boton>
              <Boton variante="secundario" onClick={() => setForm(null)}>
                Crear uno
              </Boton>
            </div>
          </Vacio>
        </Tarjeta>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {grupos.map(([titulo, lista]) =>
            lista.length ? (
              <section key={titulo} aria-label={titulo}>
                <h2 className="mb-2 px-1 text-[13px] font-semibold tracking-wide text-tinta-tenue uppercase">{titulo}</h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {lista.map((h) => (
                    <TarjetaHabito key={h.id} habito={h} onAbrir={() => setForm(h)} />
                  ))}
                </div>
              </section>
            ) : null,
          )}
          <button type="button" onClick={() => setSugeridos(true)} className="text-[15px] font-semibold text-acento">
            Activar mi lista de hábitos
          </button>
        </div>
      )}
      <BotonAgregar onClick={() => setForm(null)} texto="Nuevo hábito" />
      <FormHabito abierta={form !== undefined} habito={form ?? null} onCerrar={() => setForm(undefined)} />
      <ElegirSugeridos abierta={sugeridos} onCerrar={() => setSugeridos(false)} />
    </>
  );
}

function TarjetaHabito({ habito, onAbrir }: { habito: Habito; onAbrir: () => void }) {
  const { hoy, registros, pausas, categorias, marcar } = useDatos();
  const color = categorias.find((c) => c.id === habito.categoriaId)?.color ?? "var(--color-acento)";
  const r = racha(habito, registros, pausas, hoy);
  const semana = Array.from({ length: 7 }, (_, i) => sumarDias(hoy, i - 6));
  const mes = adherencia(habito, registros, pausas, sumarDias(hoy, -29), hoy, hoy);
  const semanal = habito.tipo === "semanal" ? avanceSemanal(habito, registros, hoy) : null;

  return (
    <article className={cx("cristal rounded-[18px] p-4", habito.estado !== "activo" && "opacity-70")}>
      <button type="button" onClick={onAbrir} className="flex w-full items-start gap-3 text-left">
        <Anillo valor={semanal ? semanal.hechas : mes.completados} total={semanal ? semanal.meta : mes.programados} color={color} tam={48} grosor={6}>
          {habito.suplemento ? <IconoPastilla className="size-4" /> : null}
        </Anillo>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-bold">{habito.nombre}</span>
          <span className="block text-[13px] text-tinta-suave">
            {textoFrecuencia(habito)}
            {habito.hora ? ` · aviso ${habito.hora}` : ""}
          </span>
          <span className="cifras mt-0.5 block text-[13px] text-tinta-suave">
            {semanal
              ? `${semanal.hechas} de ${semanal.meta} esta semana`
              : mes.programados
                ? `${mes.completados} de ${mes.programados} días en los últimos 30${mes.parciales ? ` (+${mes.parciales} parciales)` : ""}`
                : "Sin días registrados todavía"}
          </span>
        </span>
        {r.valor > 0 && (
          <span className="flex shrink-0 items-center gap-1 text-[14px] font-bold" style={{ color }}>
            <IconoLlama /> {r.valor}
            <span className="sr-only">{r.unidad} seguidos</span>
          </span>
        )}
      </button>
      {habito.medicion === "peso" && <EvolucionPeso habito={habito} />}
      {habito.estado === "activo" && habito.medicion !== "peso" && (
        <div className="mt-3 flex justify-between gap-1" role="group" aria-label="Últimos 7 días">
          {semana.map((fecha) => {
            const estado = registroDe(registros, habito.id, fecha)?.estado;
            const programado = programadoEn(habito, fecha, pausas);
            const dow = (new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7;
            return (
              <button
                key={fecha}
                type="button"
                disabled={!programado}
                onClick={() => marcar(habito.id, fecha, estado === "completado" ? null : "completado")}
                aria-label={`${fecha}: ${estado === "completado" ? "completado" : estado === "parcial" ? "parcial" : programado ? "sin marcar" : "no corresponde"}`}
                className="grid flex-1 justify-items-center gap-1"
              >
                <span className={cx("text-[11px] font-semibold", fecha === hoy ? "text-acento" : "text-tinta-tenue")}>{INICIALES[dow]}</span>
                <span
                  className={cx("grid size-7 place-items-center rounded-full text-[11px] font-bold", !programado && "opacity-30")}
                  style={
                    estado === "completado"
                      ? { background: color, color: "white" }
                      : estado === "parcial"
                        ? { border: `2px dashed ${color}`, color }
                        : { background: "color-mix(in srgb, var(--color-tinta) 8%, transparent)" }
                  }
                >
                  {estado === "parcial" ? "½" : ""}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}

/** El peso anotado cada vez que se marcó "Pesarme": último valor, cambio y gráfico. Se carga desde Hoy. */
function EvolucionPeso({ habito }: { habito: Habito }) {
  const { registros, hoy } = useDatos();
  const puntos = registros
    .filter((r) => r.habitoId === habito.id && r.valor !== null)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((r) => ({ fecha: r.fecha, valor: r.valor! }));
  if (puntos.length === 0) return <p className="mt-3 text-[13px] text-tinta-tenue">Todavía no anotaste tu peso. Se anota al marcarlo en Hoy.</p>;
  const ultimo = puntos.at(-1)!;
  const primero = puntos[0];
  const cambio = Math.round((ultimo.valor - primero.valor) * 10) / 10;
  return (
    <div className="mt-3">
      <p className="cifras text-[14px]">
        <span className="font-semibold">{kg(ultimo.valor)}</span>
        <span className="text-tinta-suave">
          {" "}
          · {fechaCorta(ultimo.fecha, hoy)}
          {puntos.length > 1 ? ` · ${cambio > 0 ? "+" : ""}${kg(cambio)} desde el ${fechaCorta(primero.fecha, hoy)}` : ""}
        </span>
      </p>
      {puntos.length > 1 && (
        <div className="mt-2">
          <GraficoLinea
            nombre={`Peso de ${habito.nombre}`}
            alto={140}
            formato={kg}
            puntos={puntos.map((p) => ({ etiqueta: fechaCorta(p.fecha, hoy), valor: p.valor }))}
          />
        </div>
      )}
    </div>
  );
}
