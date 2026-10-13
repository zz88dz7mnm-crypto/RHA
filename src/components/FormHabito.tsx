"use client";

import { useState } from "react";
import { nuevoId, useDatos } from "@/lib/rha";
import { SUGERIDOS, type Sugerido } from "@/lib/sugeridos";
import type { Habito, TipoHabito } from "@/lib/tipos";
import { CAMPO, Etiqueta, Hoja } from "./Hoja";
import { Boton, cx, Segmentos } from "./ui";

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
const NOMBRES_DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export function FormHabito({ abierta, habito, onCerrar }: { abierta: boolean; habito?: Habito | null; onCerrar: () => void }) {
  return (
    <Hoja abierta={abierta} titulo={habito ? "Editar hábito" : "Nuevo hábito"} onCerrar={onCerrar}>
      <Formulario key={habito?.id ?? "nuevo"} habito={habito ?? null} onCerrar={onCerrar} />
    </Hoja>
  );
}

function Formulario({ habito, onCerrar }: { habito: Habito | null; onCerrar: () => void }) {
  const { hoy, habitos, categorias, guardarHabitos, pausar, retomar, borrarHabito } = useDatos();
  const [nombre, setNombre] = useState(habito?.nombre ?? "");
  const [tipo, setTipo] = useState<TipoHabito>(habito?.tipo ?? "dias");
  const [dias, setDias] = useState<number[]>(habito?.dias.length ? habito.dias : [1, 2, 3, 4, 5, 6, 7]);
  const [meta, setMeta] = useState(habito?.metaSemanal ?? 3);
  const [categoriaId, setCategoriaId] = useState<string | null>(habito?.categoriaId ?? null);
  const [suplemento, setSuplemento] = useState(habito?.suplemento ?? false);
  const [conHora, setConHora] = useState(!!habito?.hora);
  const [hora, setHora] = useState(habito?.hora ?? "09:00");
  const [error, setError] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  function guardar() {
    if (!nombre.trim()) return setError("Poné un nombre.");
    if (tipo === "dias" && dias.length === 0) return setError("Elegí al menos un día.");
    guardarHabitos([
      {
        id: habito?.id ?? nuevoId(),
        nombre: nombre.trim(),
        tipo,
        dias: tipo === "dias" ? [...dias].sort() : [],
        metaSemanal: tipo === "semanal" ? meta : null,
        categoriaId,
        suplemento,
        hora: conHora ? hora : null,
        estado: habito?.estado ?? "activo",
        desde: habito?.desde ?? hoy,
        orden: habito?.orden ?? habitos.length,
      },
    ]);
    onCerrar();
  }

  async function eliminar() {
    if (!habito) return;
    setOcupado(true);
    try {
      await borrarHabito(habito.id);
      onCerrar();
    } catch {
      setError("No pude borrarlo. Revisá la conexión.");
      setOcupado(false);
    }
  }

  return (
    <form
      className="grid grid-cols-1 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <Etiqueta texto="Nombre">
        <input
          autoFocus={!habito}
          value={nombre}
          maxLength={80}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej.: Leer 20 minutos"
          className={CAMPO}
        />
      </Etiqueta>

      <Etiqueta texto="Frecuencia">
        <Segmentos
          etiqueta="Frecuencia"
          opciones={[
            ["dias", "Días fijos"],
            ["semanal", "Veces por semana"],
          ]}
          valor={tipo}
          onCambiar={setTipo}
        />
      </Etiqueta>

      {tipo === "dias" ? (
        <div className="flex justify-between gap-1.5" role="group" aria-label="Días de la semana">
          {DIAS.map((d, i) => {
            const n = i + 1;
            const activo = dias.includes(n);
            return (
              <button
                key={n}
                type="button"
                aria-pressed={activo}
                aria-label={NOMBRES_DIAS[i]}
                onClick={() => setDias((x) => (activo ? x.filter((y) => y !== n) : [...x, n]))}
                className={cx(
                  "size-11 rounded-full text-[15px] font-bold transition-colors",
                  activo ? "bg-acento text-sobre-acento" : "cristal-leve text-tinta-suave",
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-2xl bg-campo px-4 py-2">
          <span className="text-[15px] font-medium">
            {meta} {meta === 1 ? "vez" : "veces"} por semana
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMeta((m) => Math.max(1, m - 1))}
              className="cristal-leve size-9 rounded-full text-[18px] font-bold"
              aria-label="Una vez menos"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setMeta((m) => Math.min(7, m + 1))}
              className="cristal-leve size-9 rounded-full text-[18px] font-bold"
              aria-label="Una vez más"
            >
              +
            </button>
          </div>
        </div>
      )}

      <Etiqueta texto="Categoría">
        <select value={categoriaId ?? ""} onChange={(e) => setCategoriaId(e.target.value || null)} className={CAMPO}>
          <option value="">Ninguna</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </Etiqueta>

      <label className="flex items-center justify-between gap-3 text-[15px] font-medium">
        <span>
          Es un suplemento
          <span className="block text-[13px] font-normal text-tinta-tenue">Se marca con «Lo tomé».</span>
        </span>
        <input type="checkbox" checked={suplemento} onChange={(e) => setSuplemento(e.target.checked)} className="size-5 accent-[var(--color-acento)]" />
      </label>

      <div className="grid gap-2">
        <label className="flex items-center justify-between gap-3 text-[15px] font-medium">
          Recordatorio
          <input type="checkbox" checked={conHora} onChange={(e) => setConHora(e.target.checked)} className="size-5 accent-[var(--color-acento)]" />
        </label>
        {conHora && (
          <Etiqueta texto={tipo === "semanal" ? "A esta hora, los días que todavía no llegaste a la meta" : "A esta hora, si todavía no lo marcaste"}>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={CAMPO} />
          </Etiqueta>
        )}
      </div>

      {error && (
        <p role="alert" className="text-[14px] text-rojo">
          {error}
        </p>
      )}
      <Boton type="submit" className="w-full">
        {habito ? "Guardar cambios" : "Agregar hábito"}
      </Boton>

      {habito && (
        <div className="grid gap-2 border-t border-linea pt-4">
          {habito.estado === "activo" && (
            <Boton
              variante="secundario"
              onClick={() => {
                pausar(habito);
                onCerrar();
              }}
            >
              Pausar
            </Boton>
          )}
          {habito.estado === "pausado" && (
            <Boton
              variante="suave"
              onClick={() => {
                retomar(habito);
                onCerrar();
              }}
            >
              Retomar
            </Boton>
          )}
          <p className="text-[13px] text-tinta-tenue">Mientras está en pausa, los días no cuentan como incumplidos y no te avisa.</p>
          {habito.estado !== "archivado" ? (
            <Boton
              variante="secundario"
              onClick={() => {
                guardarHabitos([{ ...habito, estado: "archivado" }]);
                onCerrar();
              }}
            >
              Archivar (guarda el historial)
            </Boton>
          ) : (
            <Boton
              variante="secundario"
              onClick={() => {
                guardarHabitos([{ ...habito, estado: "activo" }]);
                onCerrar();
              }}
            >
              Desarchivar
            </Boton>
          )}
          {confirmar ? (
            <div className="grid gap-2 rounded-2xl bg-rojo/10 p-3 text-[14px]">
              <p>Se borra «{habito.nombre}» con todo su historial de días. No se puede deshacer: si solo querés dejarlo, archivalo.</p>
              <div className="grid grid-cols-2 gap-2">
                <Boton variante="secundario" onClick={() => setConfirmar(false)} disabled={ocupado}>
                  Volver
                </Boton>
                <Boton variante="peligro" onClick={eliminar} disabled={ocupado}>
                  Borrar
                </Boton>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmar(true)} className="h-10 text-[15px] font-semibold text-rojo">
              Borrar hábito
            </button>
          )}
        </div>
      )}
    </form>
  );
}

/** La primera vez: elegir cuáles de los hábitos sugeridos activar. Vienen tildados los fundamentales. */
export function ElegirSugeridos({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const { hoy, habitos, categorias, guardarHabitos } = useDatos();
  const existentes = new Set(habitos.map((h) => h.nombre.toLowerCase()));
  const disponibles = SUGERIDOS.filter((s) => !existentes.has(s.nombre.toLowerCase()));
  const [elegidos, setElegidos] = useState(() => new Set(disponibles.filter((s) => s.recomendado).map((s) => s.nombre)));
  const grupos = ["Fundamentales", "Semanales", "Para sumar de a poco"] as const;

  function activar() {
    const lista: Habito[] = disponibles
      .filter((s) => elegidos.has(s.nombre))
      .map((s: Sugerido, i) => ({
        id: nuevoId(),
        nombre: s.nombre,
        tipo: s.tipo,
        dias: s.dias,
        metaSemanal: s.metaSemanal,
        categoriaId: categorias.find((c) => c.nombre === s.categoria)?.id ?? null,
        suplemento: s.suplemento,
        hora: s.hora,
        estado: "activo",
        desde: hoy,
        orden: habitos.length + i,
      }));
    guardarHabitos(lista);
    onCerrar();
  }

  return (
    <Hoja abierta={abierta} titulo="Elegí tus hábitos" onCerrar={onCerrar}>
      <p className="text-[15px] leading-snug text-tinta-suave">
        Armados con lo que contaste de tu rutina. Vienen marcados los fundamentales: la idea es que esos salgan aunque estés cansado, y sumar el resto de a
        poco. Después podés cambiar días, horas y recordatorios.
      </p>
      {grupos.map((g) => {
        const lista = disponibles.filter((s) => s.grupo === g);
        if (!lista.length) return null;
        return (
          <fieldset key={g} className="mt-5">
            <legend className="mb-2 text-[13px] font-semibold tracking-wide text-tinta-tenue uppercase">{g}</legend>
            <ul className="cristal-leve divide-y divide-linea rounded-2xl">
              {lista.map((s) => (
                <li key={s.nombre}>
                  <label className="flex items-center gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={elegidos.has(s.nombre)}
                      onChange={(e) =>
                        setElegidos((x) => {
                          const n = new Set(x);
                          if (e.target.checked) n.add(s.nombre);
                          else n.delete(s.nombre);
                          return n;
                        })
                      }
                      className="size-5 shrink-0 accent-[var(--color-acento)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold">{s.nombre}</span>
                      <span className="block text-[13px] text-tinta-suave">
                        {s.tipo === "semanal"
                          ? `${s.metaSemanal} veces por semana`
                          : s.dias.length === 7
                            ? "Todos los días"
                            : s.dias.length === 5
                              ? "De lunes a viernes"
                              : "Domingos"}
                        {s.hora ? ` · aviso ${s.hora}` : ""}
                        {s.suplemento ? " · suplemento" : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        );
      })}
      <Boton className="sticky bottom-0 mt-6 w-full" onClick={activar} disabled={elegidos.size === 0}>
        Activar {elegidos.size} {elegidos.size === 1 ? "hábito" : "hábitos"}
      </Boton>
    </Hoja>
  );
}
