"use client";

import { useState } from "react";
import { fechasRepetidas, solapamientos } from "@/lib/agenda";
import { fechaCorta, sumarDias } from "@/lib/fechas";
import { nuevoId, useDatos } from "@/lib/rha";
import type { Actividad, Prioridad } from "@/lib/tipos";
import { CAMPO, Etiqueta, Hoja } from "./Hoja";
import { Boton, cx, Segmentos } from "./ui";

const RECORDATORIOS: [string, string][] = [
  ["", "Sin aviso"],
  ["0", "A la hora"],
  ["5", "5 min antes"],
  ["15", "15 min antes"],
  ["30", "30 min antes"],
  ["60", "1 hora antes"],
  ["120", "2 horas antes"],
  ["1440", "1 día antes"],
];

type Borrador = {
  titulo: string;
  fecha: string;
  conHorario: boolean;
  inicio: string;
  fin: string;
  categoriaId: string | null;
  prioridad: Prioridad;
  recordatorio: string;
  notas: string;
  repetir: boolean;
  hasta: string;
};

/** Crear o editar una actividad. Avisa si se pisa con otra, pero la decisión es del usuario. */
export function FormActividad({
  abierta,
  actividad,
  fecha,
  onCerrar,
}: {
  abierta: boolean;
  actividad?: Actividad | null;
  fecha?: string;
  onCerrar: () => void;
}) {
  return (
    <Hoja abierta={abierta} titulo={actividad ? "Editar actividad" : "Nueva actividad"} onCerrar={onCerrar}>
      <Formulario key={actividad?.id ?? fecha ?? "nueva"} actividad={actividad ?? null} fecha={fecha} onCerrar={onCerrar} />
    </Hoja>
  );
}

function Formulario({ actividad, fecha, onCerrar }: { actividad: Actividad | null; fecha?: string; onCerrar: () => void }) {
  const { hoy, categorias, actividades, ajustes, guardarActividades, borrarActividades } = useDatos();
  const inicial = fecha ?? hoy;
  const [b, setB] = useState<Borrador>(() => ({
    titulo: actividad?.titulo ?? "",
    fecha: actividad?.fecha ?? inicial,
    conHorario: actividad ? actividad.inicio !== null : true,
    inicio: actividad?.inicio ?? "18:00",
    fin: actividad?.fin ?? "19:00",
    categoriaId: actividad?.categoriaId ?? null,
    prioridad: actividad?.prioridad ?? "media",
    recordatorio: actividad?.recordatorio === null || actividad?.recordatorio === undefined ? (actividad ? "" : "15") : String(actividad.recordatorio),
    notas: actividad?.notas ?? "",
    repetir: false,
    hasta: sumarDias(actividad?.fecha ?? inicial, 7 * 8),
  }));
  const [error, setError] = useState("");
  const [choques, setChoques] = useState<Actividad[] | null>(null);
  const [alcance, setAlcance] = useState<"esta" | "siguientes">("esta");
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const cambiar = (c: Partial<Borrador>) => {
    setB((x) => ({ ...x, ...c }));
    setChoques(null);
    setError("");
  };
  const enSerie = actividad?.serieId ? actividades.filter((a) => a.serieId === actividad.serieId && a.fecha >= actividad.fecha) : [];

  function armar(base: Partial<Actividad>, fechaActividad: string): Actividad {
    return {
      id: base.id ?? nuevoId(),
      titulo: b.titulo.trim(),
      fecha: fechaActividad,
      inicio: b.conHorario ? b.inicio : null,
      fin: b.conHorario && b.fin ? b.fin : null,
      categoriaId: b.categoriaId,
      prioridad: b.prioridad,
      estado: base.estado ?? "pendiente",
      notas: b.notas.trim(),
      recordatorio: b.recordatorio === "" ? null : Number(b.recordatorio),
      serieId: base.serieId ?? null,
    };
  }

  function guardar(ignorarChoques = false) {
    if (!b.titulo.trim()) return setError("Poné un título.");
    if (!b.fecha) return setError("Elegí el día.");
    if (b.conHorario && b.fin && b.fin <= b.inicio) return setError("La hora de fin tiene que ser después del inicio.");
    if (b.repetir && b.hasta < b.fecha) return setError("La repetición tiene que terminar después del primer día.");

    let lista: Actividad[];
    if (actividad && alcance === "siguientes" && enSerie.length > 1) {
      // Mismos datos para esta y las siguientes de la serie; cada una conserva su día (corrido si cambió la fecha).
      const corrimiento = Math.round((Date.parse(b.fecha) - Date.parse(actividad.fecha)) / 86_400_000);
      lista = enSerie.map((a) => armar(a, sumarDias(a.fecha, corrimiento)));
    } else if (actividad) {
      lista = [armar(actividad, b.fecha)];
    } else if (b.repetir) {
      const serieId = nuevoId();
      lista = fechasRepetidas(b.fecha, b.hasta).map((f) => armar({ serieId }, f));
    } else {
      lista = [armar({}, b.fecha)];
    }

    if (!ignorarChoques) {
      const ids = new Set(lista.map((a) => a.id));
      const otras = actividades.filter((a) => !ids.has(a.id));
      const encontrados = lista.flatMap((a) => solapamientos(a, otras));
      if (encontrados.length) return setChoques(encontrados);
    }
    guardarActividades(lista);
    onCerrar();
  }

  function cambiarEstado(estado: Actividad["estado"]) {
    if (!actividad) return;
    guardarActividades([{ ...actividad, estado }]);
    onCerrar();
  }

  function borrar() {
    if (!actividad) return;
    borrarActividades(alcance === "siguientes" && enSerie.length > 1 ? enSerie.map((a) => a.id) : [actividad.id]);
    onCerrar();
  }

  const tareaSinHora = !b.conHorario;

  return (
    <form
      className="grid grid-cols-1 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <Etiqueta texto="Título">
        <input
          autoFocus={!actividad}
          value={b.titulo}
          maxLength={160}
          onChange={(e) => cambiar({ titulo: e.target.value })}
          placeholder="Ej.: Estudiar matrices"
          className={CAMPO}
        />
      </Etiqueta>

      <div className="grid grid-cols-2 gap-3">
        <Etiqueta texto="Día">
          <input type="date" value={b.fecha} onChange={(e) => cambiar({ fecha: e.target.value })} className={CAMPO} />
        </Etiqueta>
        <Etiqueta texto="Tipo">
          <Segmentos
            etiqueta="Tipo"
            opciones={[
              ["si", "Con hora"],
              ["no", "Tarea"],
            ]}
            valor={b.conHorario ? "si" : "no"}
            onCambiar={(v) => cambiar({ conHorario: v === "si", recordatorio: v === "no" && b.recordatorio !== "" ? "0" : b.recordatorio })}
          />
        </Etiqueta>
      </div>

      {b.conHorario && (
        <div className="grid grid-cols-2 gap-3">
          <Etiqueta texto="Empieza">
            <input type="time" value={b.inicio} onChange={(e) => cambiar({ inicio: e.target.value })} className={CAMPO} />
          </Etiqueta>
          <Etiqueta texto="Termina">
            <input type="time" value={b.fin} onChange={(e) => cambiar({ fin: e.target.value })} className={CAMPO} />
          </Etiqueta>
        </div>
      )}

      <fieldset className="grid gap-1.5">
        <legend className="mb-1 text-[13px] font-medium text-tinta-suave">Categoría</legend>
        <div className="flex flex-wrap gap-2">
          {[{ id: null, nombre: "Ninguna", color: "#8e8e93" }, ...categorias].map((c) => (
            <button
              key={c.id ?? "ninguna"}
              type="button"
              aria-pressed={b.categoriaId === c.id}
              onClick={() => cambiar({ categoriaId: c.id })}
              className={cx(
                "flex h-9 items-center gap-2 rounded-full border px-3 text-[14px] font-semibold",
                b.categoriaId === c.id ? "border-transparent text-white" : "border-linea bg-campo",
              )}
              style={b.categoriaId === c.id ? { background: c.color } : undefined}
            >
              {b.categoriaId !== c.id && <span className="size-2.5 rounded-full" style={{ background: c.color }} />}
              {c.nombre}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Etiqueta texto="Prioridad">
          <select value={b.prioridad} onChange={(e) => cambiar({ prioridad: e.target.value as Prioridad })} className={CAMPO}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </Etiqueta>
        <Etiqueta texto="Recordatorio">
          <select value={b.recordatorio} onChange={(e) => cambiar({ recordatorio: e.target.value })} className={CAMPO}>
            {(tareaSinHora ? [["", "Sin aviso"] as [string, string], ["0", `Ese día a las ${ajustes.horaTareas}`] as [string, string]] : RECORDATORIOS).map(
              ([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ),
            )}
          </select>
        </Etiqueta>
      </div>

      {!actividad && (
        <div className="grid gap-2">
          <label className="flex items-center justify-between gap-3 text-[15px] font-medium">
            Repetir cada semana
            <input
              type="checkbox"
              checked={b.repetir}
              onChange={(e) => cambiar({ repetir: e.target.checked })}
              className="size-5 accent-[var(--color-acento)]"
            />
          </label>
          {b.repetir && (
            <Etiqueta texto={`Hasta (${fechasRepetidas(b.fecha, b.hasta).length} veces, máximo 26)`}>
              <input type="date" value={b.hasta} min={b.fecha} onChange={(e) => cambiar({ hasta: e.target.value })} className={CAMPO} />
            </Etiqueta>
          )}
        </div>
      )}

      <Etiqueta texto="Notas">
        <textarea value={b.notas} maxLength={2000} rows={2} onChange={(e) => cambiar({ notas: e.target.value })} className={`${CAMPO} h-auto py-2`} />
      </Etiqueta>

      {actividad && enSerie.length > 1 && (
        <Etiqueta texto="Esta actividad se repite. Los cambios aplican a:">
          <Segmentos
            etiqueta="Alcance"
            opciones={[
              ["esta", "Solo esta"],
              ["siguientes", `Esta y las siguientes (${enSerie.length})`],
            ]}
            valor={alcance}
            onCambiar={setAlcance}
          />
        </Etiqueta>
      )}

      {error && (
        <p role="alert" className="text-[14px] text-rojo">
          {error}
        </p>
      )}

      {choques ? (
        <div role="alert" className="grid gap-3 rounded-2xl bg-[#d97706]/12 p-4 text-[14px]">
          <p className="font-semibold">Se pisa con:</p>
          <ul className="grid gap-1">
            {choques.slice(0, 4).map((c) => (
              <li key={c.id}>
                {c.titulo} · {fechaCorta(c.fecha)} {c.inicio}
                {c.fin ? `–${c.fin}` : ""}
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Boton variante="secundario" onClick={() => setChoques(null)}>
              Cambiar
            </Boton>
            <Boton onClick={() => guardar(true)}>Guardar igual</Boton>
          </div>
        </div>
      ) : (
        <Boton type="submit" className="w-full">
          {actividad ? "Guardar cambios" : b.repetir ? `Crear ${fechasRepetidas(b.fecha, b.hasta).length} actividades` : "Agregar"}
        </Boton>
      )}

      {actividad && (
        <div className="grid grid-cols-2 gap-2 border-t border-linea pt-4">
          {actividad.estado !== "completada" ? (
            <Boton variante="suave" onClick={() => cambiarEstado("completada")}>
              Completar
            </Boton>
          ) : (
            <Boton variante="secundario" onClick={() => cambiarEstado("pendiente")}>
              Marcar pendiente
            </Boton>
          )}
          {actividad.estado !== "cancelada" ? (
            <Boton variante="secundario" onClick={() => cambiarEstado("cancelada")}>
              Cancelar
            </Boton>
          ) : (
            <Boton variante="secundario" onClick={() => cambiarEstado("pendiente")}>
              Reactivar
            </Boton>
          )}
          {confirmarBorrar ? (
            <div className="col-span-2 grid gap-2 rounded-2xl bg-rojo/10 p-3 text-[14px]">
              <p>
                Se borra «{actividad.titulo}»{alcance === "siguientes" && enSerie.length > 1 ? ` y las ${enSerie.length - 1} siguientes de la serie` : ""}. No
                se puede deshacer; si solo no la vas a hacer, mejor cancelala y queda en el historial.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Boton variante="secundario" onClick={() => setConfirmarBorrar(false)}>
                  Volver
                </Boton>
                <Boton variante="peligro" onClick={borrar}>
                  Borrar
                </Boton>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmarBorrar(true)} className="col-span-2 h-10 text-[15px] font-semibold text-rojo">
              Borrar
            </button>
          )}
        </div>
      )}
    </form>
  );
}
