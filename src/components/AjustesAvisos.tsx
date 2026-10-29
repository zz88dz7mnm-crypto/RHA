"use client";

import { useEffect, useState } from "react";
import type { EstadoAvisos } from "@/app/api/avisos/estado/route";
import { useDatos } from "@/lib/rha";
import type { Ajustes } from "@/lib/tipos";
import { CAMPO } from "./Hoja";
import { cx, Tarjeta } from "./ui";

const CAMPO_HORA = CAMPO.replace("w-full", "w-36 shrink-0");

/** Un interruptor tipo iOS, con su texto. */
function Interruptor({ titulo, detalle, activo, onCambiar }: { titulo: string; detalle?: string; activo: boolean; onCambiar: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[15px]">
      <span className="min-w-0">
        {titulo}
        {detalle && <span className="block text-[13px] text-tinta-tenue">{detalle}</span>}
      </span>
      <input type="checkbox" role="switch" checked={activo} onChange={(e) => onCambiar(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={cx(
          "relative h-7 w-12 shrink-0 rounded-full border border-linea transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-acento",
          activo ? "bg-acento" : "bg-tinta/10",
        )}
      >
        <span
          className={cx("absolute top-0.5 size-[22px] rounded-full bg-white shadow transition-transform", activo ? "translate-x-[22px]" : "translate-x-0.5")}
        />
      </span>
    </label>
  );
}

function Hora({ etiqueta, valor, onCambiar }: { etiqueta: string; valor: string; onCambiar: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 pl-4 text-[14px] text-tinta-suave">
      {etiqueta}
      <input type="time" value={valor} onChange={(e) => e.target.value && onCambiar(e.target.value)} className={CAMPO_HORA} />
    </label>
  );
}

/** Qué avisos mandar y cuándo. Se guarda en la base: vale para todos los dispositivos. */
export function AjustesAvisos() {
  const { ajustes, guardarAjustes } = useDatos();
  const g = (c: Partial<Ajustes>) => guardarAjustes(c);
  const silencio = ajustes.silencioDesde !== null && ajustes.silencioHasta !== null;

  return (
    <Tarjeta className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h2 className="text-[17px] font-bold">Qué avisos querés</h2>
        <p className="text-[13px] text-tinta-tenue">Vale para todos tus dispositivos.</p>
      </div>

      <Interruptor
        titulo="Actividades y tareas"
        detalle="Con el aviso que le pongas a cada una (al crearla o editarla)."
        activo={ajustes.avisosActividades}
        onCambiar={(v) => g({ avisosActividades: v })}
      />
      {ajustes.avisosActividades && <Hora etiqueta="Tareas sin horario, a las" valor={ajustes.horaTareas} onCambiar={(v) => g({ horaTareas: v })} />}

      <Interruptor
        titulo="Hábitos"
        detalle="A la hora de cada uno, si todavía no lo marcaste."
        activo={ajustes.avisosHabitos}
        onCambiar={(v) => g({ avisosHabitos: v })}
      />
      <Interruptor
        titulo="Suplementos"
        detalle="«¿Ya lo tomaste?» a la hora de cada uno."
        activo={ajustes.avisosSuplementos}
        onCambiar={(v) => g({ avisosSuplementos: v })}
      />
      {(ajustes.avisosHabitos || ajustes.avisosSuplementos) && <HorasDeHabitos />}

      <Interruptor titulo="Resumen del día" detalle="Actividades y hábitos de hoy." activo={ajustes.resumenDiario} onCambiar={(v) => g({ resumenDiario: v })} />
      {ajustes.resumenDiario && <Hora etiqueta="A las" valor={ajustes.horaResumen} onCambiar={(v) => g({ horaResumen: v })} />}

      <Interruptor
        titulo="Resumen semanal"
        detalle="Los domingos: cómo te fue y a planificar la próxima."
        activo={ajustes.resumenSemanal}
        onCambiar={(v) => g({ resumenSemanal: v })}
      />
      {ajustes.resumenSemanal && <Hora etiqueta="Domingo a las" valor={ajustes.horaSemanal} onCambiar={(v) => g({ horaSemanal: v })} />}

      <Interruptor
        titulo="No molestar"
        detalle="En ese horario no llega ningún aviso (y no se acumulan para después)."
        activo={silencio}
        onCambiar={(v) => g(v ? { silencioDesde: "00:30", silencioHasta: "08:00" } : { silencioDesde: null, silencioHasta: null })}
      />
      {silencio && (
        <>
          <Hora etiqueta="Desde" valor={ajustes.silencioDesde!} onCambiar={(v) => g({ silencioDesde: v })} />
          <Hora etiqueta="Hasta" valor={ajustes.silencioHasta!} onCambiar={(v) => g({ silencioHasta: v })} />
        </>
      )}
    </Tarjeta>
  );
}

/** La hora de aviso de cada hábito activo, para cambiarla sin entrar a editarlo. */
function HorasDeHabitos() {
  const { habitos, guardarHabitos, ajustes } = useDatos();
  const activos = habitos
    .filter((h) => h.estado === "activo" && (h.suplemento ? ajustes.avisosSuplementos : ajustes.avisosHabitos))
    .sort((a, b) => a.orden - b.orden);
  if (!activos.length) return null;
  return (
    <details className="min-w-0 rounded-2xl bg-tinta/[0.04] px-3 py-2">
      <summary className="cursor-pointer py-1 text-[14px] font-semibold text-acento">
        Hora de cada uno ({activos.filter((h) => h.hora).length} de {activos.length} con aviso)
      </summary>
      <ul className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2 pb-1">
        {activos.map((h) => (
          <li key={h.id} className="flex items-center gap-3 text-[14px]">
            <input
              type="checkbox"
              checked={!!h.hora}
              aria-label={`Aviso de ${h.nombre}`}
              onChange={(e) => guardarHabitos([{ ...h, hora: e.target.checked ? "09:00" : null }])}
              className="size-5 shrink-0 accent-[var(--color-acento)]"
            />
            <span className={cx("min-w-0 flex-1 truncate", !h.hora && "text-tinta-tenue")}>{h.nombre}</span>
            {h.hora ? (
              <input
                type="time"
                value={h.hora}
                aria-label={`Hora de ${h.nombre}`}
                onChange={(e) => e.target.value && guardarHabitos([{ ...h, hora: e.target.value }])}
                className={CAMPO_HORA}
              />
            ) : (
              <span className="w-36 shrink-0 text-right text-[13px] text-tinta-tenue">Sin aviso</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

const hace = (min: number) => {
  return min < 1 ? "recién" : min < 60 ? `hace ${min} min` : min < 1440 ? `hace ${Math.round(min / 60)} h` : `hace ${Math.round(min / 1440)} días`;
};

/** Qué le falta al servidor para mandar avisos, en una lista de chequeo. */
export function EstadoServidor() {
  const [estado, setEstado] = useState<(EstadoAvisos & { minutos: number | null }) | "cargando" | "error">("cargando");

  useEffect(() => {
    let vigente = true;
    fetch("/api/avisos/estado", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(
        (e: EstadoAvisos) =>
          // Hace cuántos minutos pasó el disparador, calculado al recibir la respuesta.
          vigente && setEstado({ ...e, minutos: e.ultimaPasada ? Math.round((Date.now() - new Date(e.ultimaPasada).getTime()) / 60_000) : null }),
      )
      .catch(() => vigente && setEstado("error"));
    return () => {
      vigente = false;
    };
  }, []);

  if (estado === "cargando") return <p className="text-[14px] text-tinta-suave">Revisando el servidor…</p>;
  if (estado === "error") return <p className="text-[14px] text-tinta-suave">No pude revisar el servidor (¿sin conexión?).</p>;

  const faltan = [
    !estado.claves.vapidPublica && "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    !estado.claves.vapidPrivada && "VAPID_PRIVATE_KEY",
    !estado.claves.secreto && "AVISOS_SECRETO",
    !estado.claves.servidor && "SUPABASE_SECRET_KEY",
  ].filter(Boolean) as string[];
  const reciente = estado.minutos !== null && estado.minutos < 10;

  const items: { ok: boolean; titulo: string; texto: string }[] = [
    {
      ok: !faltan.length,
      titulo: "Claves en Vercel",
      texto: faltan.length ? `Faltan: ${faltan.join(", ")}. Se cargan en Vercel → Settings → Environment Variables, y después Redeploy.` : "Están todas.",
    },
    {
      ok: !!reciente,
      titulo: "Disparador de Supabase",
      texto: reciente
        ? `Andando (última pasada ${hace(estado.minutos!)}).`
        : estado.minutos !== null
          ? `Se cortó: la última pasada fue ${hace(estado.minutos)}. Revisá el SQL de avisos en Supabase.`
          : "Nunca pasó: falta correr el SQL de avisos (supabase/avisos.sql) en Supabase con la dirección de la app.",
    },
    {
      ok: (estado.dispositivos ?? 0) > 0,
      titulo: "Dispositivos",
      texto:
        estado.dispositivos === null
          ? "No se puede saber hasta que esté SUPABASE_SECRET_KEY."
          : estado.dispositivos
            ? `${estado.dispositivos} con notificaciones activadas.`
            : "Ninguno: activalas arriba en cada dispositivo.",
    },
  ];

  return (
    <ul className="grid gap-2">
      {items.map((i) => (
        <li key={i.titulo} className="flex gap-2.5 text-[14px] leading-snug">
          <span
            aria-hidden="true"
            className={cx(
              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[12px] font-bold",
              i.ok ? "bg-verde/20 text-verde" : "bg-rojo/15 text-rojo",
            )}
          >
            {i.ok ? "✓" : "!"}
          </span>
          <span className="min-w-0">
            <span className="font-semibold">{i.titulo}</span>
            <span className="sr-only">{i.ok ? ": listo" : ": falta"}</span> <span className="text-tinta-suave">{i.texto}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
