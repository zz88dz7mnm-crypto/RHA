"use client";

import { useState } from "react";
import { textoDuracion, aMinutos } from "@/lib/agenda";
import { avanceSemanal, racha, registroDe } from "@/lib/habitos";
import { useDatos } from "@/lib/rha";
import type { Actividad, EstadoRegistro, Habito, Registro } from "@/lib/tipos";
import { IconoCampana, IconoCheck, IconoLlama, IconoPastilla, IconoRepetir } from "./iconos";
import { cx } from "./ui";

/** Una actividad en una lista: barra de color de su categoría, hora, título y casilla para completar. */
export function FilaActividad({ actividad, onAbrir, mostrarFecha }: { actividad: Actividad; onAbrir: () => void; mostrarFecha?: string }) {
  const { categorias, guardarActividades } = useDatos();
  const cat = categorias.find((c) => c.id === actividad.categoriaId);
  const hecha = actividad.estado === "completada";
  const cancelada = actividad.estado === "cancelada";
  return (
    <li className="flex items-stretch gap-3">
      <button
        type="button"
        onClick={() => guardarActividades([{ ...actividad, estado: hecha ? "pendiente" : "completada" }])}
        disabled={cancelada}
        aria-pressed={hecha}
        aria-label={hecha ? `${actividad.titulo}: hecha. Tocá para desmarcar` : `Completar ${actividad.titulo}`}
        className={cx(
          "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
          hecha ? "border-transparent text-white" : "border-tinta/25 text-transparent",
          cancelada && "opacity-40",
        )}
        style={hecha ? { background: cat?.color ?? "var(--color-acento)" } : undefined}
      >
        <IconoCheck />
      </button>
      <button type="button" onClick={onAbrir} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <span className="mt-1 w-1 self-stretch rounded-full" style={{ background: cat?.color ?? "var(--color-linea)" }} aria-hidden="true" />
        <span className="min-w-0 flex-1 pb-3">
          <span className={cx("block text-[16px] leading-snug font-semibold", (hecha || cancelada) && "text-tinta-tenue line-through")}>
            {actividad.titulo}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 text-[13px] text-tinta-suave">
            {mostrarFecha && <span>{mostrarFecha}</span>}
            {actividad.inicio ? (
              <span className="cifras">
                {actividad.inicio}
                {actividad.fin ? `–${actividad.fin}` : ""}
                {actividad.fin ? ` · ${textoDuracion(aMinutos(actividad.fin) - aMinutos(actividad.inicio))}` : ""}
              </span>
            ) : (
              <span>Sin horario</span>
            )}
            {cat && <span>{cat.nombre}</span>}
            {actividad.prioridad === "alta" && <span className="font-semibold text-rojo">Prioridad alta</span>}
            {cancelada && <span>Cancelada</span>}
            {actividad.recordatorio !== null && <IconoCampana className="size-3.5" />}
            {actividad.serieId && <IconoRepetir className="size-3.5" />}
          </span>
        </span>
      </button>
    </li>
  );
}

/** "78,4 kg". */
export const kg = (n: number) => `${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })} kg`;

/** El último valor anotado de un hábito con medición (el peso más reciente). */
export function ultimoValor(registros: Registro[], habitoId: string): { fecha: string; valor: number } | null {
  let ultimo: { fecha: string; valor: number } | null = null;
  for (const r of registros)
    if (r.habitoId === habitoId && r.valor !== null && (!ultimo || r.fecha > ultimo.fecha)) ultimo = { fecha: r.fecha, valor: r.valor };
  return ultimo;
}

/** Pide los kilos al marcar "Pesarme". Acepta coma o punto. */
function IngresoPeso({ inicial, onGuardar, onCancelar }: { inicial: number | null; onGuardar: (kg: number) => void; onCancelar: () => void }) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  return (
    <form
      className="mt-2 ml-13 grid min-w-0 gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(texto.trim().replace(",", "."));
        if (!texto.trim() || !Number.isFinite(n) || n <= 20 || n >= 400) return setError("Escribí tu peso en kilos, por ejemplo 76,5.");
        onGuardar(Math.round(n * 100) / 100);
      }}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <input
          inputMode="decimal"
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={inicial ? `La última vez: ${String(inicial).replace(".", ",")}` : "Kilos, ej.: 76,5"}
          aria-label="Peso en kilos"
          className="cifras h-10 w-full min-w-0 rounded-xl border border-linea bg-campo px-3 text-[16px] outline-none focus:border-acento"
        />
        <button type="submit" className="h-10 rounded-full bg-acento px-4 text-[14px] font-semibold text-sobre-acento">
          Guardar
        </button>
        <button type="button" onClick={onCancelar} className="px-2 text-[14px] font-semibold text-tinta-suave">
          Cancelar
        </button>
      </div>
      {error && (
        <p role="alert" className="text-[13px] text-rojo">
          {error}
        </p>
      )}
    </form>
  );
}

const ETIQUETA: Record<EstadoRegistro, string> = { completado: "Completado", parcial: "Parcial", no_completado: "No lo hice" };

/**
 * Un hábito del día. El círculo marca "completado" de un toque; el menú permite parcial o no completado.
 * Los suplementos dicen "Lo tomé".
 */
export function FilaHabito({ habito, fecha, onEditar }: { habito: Habito; fecha: string; onEditar?: () => void }) {
  const { registros, pausas, categorias, hoy, marcar } = useDatos();
  const [menu, setMenu] = useState(false);
  const [pidiendoPeso, setPidiendoPeso] = useState(false);
  const registro = registroDe(registros, habito.id, fecha);
  const estado = registro?.estado;
  const conPeso = habito.medicion === "peso";
  const ultimoPeso = conPeso ? ultimoValor(registros, habito.id) : null;
  const cat = categorias.find((c) => c.id === habito.categoriaId);
  const color = cat?.color ?? "var(--color-acento)";
  const semanal = habito.tipo === "semanal" ? avanceSemanal(habito, registros, fecha) : null;
  const r = racha(habito, registros, pausas, hoy);

  return (
    <li className="py-1">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            estado === "completado" ? marcar(habito.id, fecha, null) : conPeso ? setPidiendoPeso((x) => !x) : marcar(habito.id, fecha, "completado")
          }
          aria-pressed={estado === "completado"}
          aria-label={
            estado === "completado"
              ? `${habito.nombre}: completado. Tocá para desmarcar`
              : `Marcar ${habito.nombre} como ${habito.suplemento ? "tomado" : "hecho"}`
          }
          className={cx(
            "grid size-10 shrink-0 place-items-center rounded-full border-2 transition-all active:scale-95",
            estado === "completado" ? "border-transparent text-white" : estado === "parcial" ? "border-dashed" : "border-tinta/20 text-tinta-tenue",
          )}
          style={estado === "completado" ? { background: color } : estado === "parcial" ? { borderColor: color, color } : undefined}
        >
          {estado === "completado" ? (
            <IconoCheck className="size-5" />
          ) : estado === "parcial" ? (
            <span className="text-[11px] font-bold">½</span>
          ) : estado === "no_completado" ? (
            <span className="text-[16px]">–</span>
          ) : habito.suplemento ? (
            <IconoPastilla className="size-4" />
          ) : null}
        </button>
        <button type="button" onClick={onEditar ?? (() => setMenu((m) => !m))} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[16px] font-semibold">{habito.nombre}</span>
          <span className="flex flex-wrap items-center gap-x-2 text-[13px] text-tinta-suave">
            {semanal ? (
              <span className={cx(semanal.cumplida && "font-semibold text-verde")}>
                {semanal.hechas} de {semanal.meta} esta semana
              </span>
            ) : estado ? (
              <span>{ETIQUETA[estado]}</span>
            ) : (
              <span>{habito.suplemento ? "¿Lo tomaste?" : "Pendiente"}</span>
            )}
            {conPeso &&
              (registro?.valor ? (
                <span className="cifras font-semibold">{kg(registro.valor)}</span>
              ) : (
                ultimoPeso && <span className="cifras">Último: {kg(ultimoPeso.valor)}</span>
              ))}
            {r.valor > 1 && (
              <span className="inline-flex items-center gap-0.5 font-semibold" style={{ color }}>
                <IconoLlama className="size-3.5" /> {r.valor} {r.unidad}
              </span>
            )}
            {habito.hora && <span className="cifras">{habito.hora}</span>}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-expanded={menu}
          aria-label={`Más opciones de ${habito.nombre}`}
          className="rounded-full px-2 py-1 text-[18px] text-tinta-tenue"
        >
          ···
        </button>
      </div>
      {pidiendoPeso && (
        <IngresoPeso
          inicial={registro?.valor ?? ultimoPeso?.valor ?? null}
          onGuardar={(valor) => {
            marcar(habito.id, fecha, "completado", valor);
            setPidiendoPeso(false);
          }}
          onCancelar={() => setPidiendoPeso(false)}
        />
      )}
      {menu && (
        <div className="mt-2 ml-13 flex flex-wrap gap-2" role="group" aria-label={`Cómo te fue con ${habito.nombre}`}>
          {(["completado", "parcial", "no_completado"] as const).map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={estado === e}
              onClick={() => {
                marcar(habito.id, fecha, estado === e ? null : e);
                setMenu(false);
              }}
              className={cx("h-9 rounded-full px-3 text-[14px] font-semibold", estado === e ? "bg-tinta text-fondo" : "cristal-leve")}
            >
              {habito.suplemento && e === "completado" ? "Lo tomé" : ETIQUETA[e]}
            </button>
          ))}
          {estado && (
            <button
              type="button"
              onClick={() => (marcar(habito.id, fecha, null), setMenu(false))}
              className="h-9 rounded-full px-3 text-[14px] font-semibold text-tinta-suave"
            >
              Borrar marca
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** Anillo de progreso al estilo de Salud/Actividad. */
export function Anillo({
  valor,
  total,
  color = "var(--color-acento)",
  tam = 64,
  grosor = 8,
  children,
}: {
  valor: number;
  total: number;
  color?: string;
  tam?: number;
  grosor?: number;
  children?: React.ReactNode;
}) {
  const r = (tam - grosor) / 2;
  const c = 2 * Math.PI * r;
  const parte = total > 0 ? Math.min(1, valor / total) : 0;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} className="-rotate-90" aria-hidden="true">
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={grosor} />
        <circle
          cx={tam / 2}
          cy={tam / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={`${c * parte} ${c}`}
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
