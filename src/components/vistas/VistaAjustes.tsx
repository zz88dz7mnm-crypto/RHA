"use client";

import { useState } from "react";
import { nuevoId, useDatos } from "@/lib/rha";
import { achicarImagen } from "@/lib/imagen";
import { useTema, type Preferencia } from "@/lib/tema";
import type { Categoria } from "@/lib/tipos";
import { CAMPO } from "../Hoja";
import { Notificaciones } from "../Notificaciones";
import { Boton, Encabezado, Segmentos, Tarjeta } from "../ui";

const CAMPO_HORA = CAMPO.replace("w-full", "w-36 shrink-0");

const COLORES = ["#ff2d55", "#ff6b00", "#ffcc00", "#34c759", "#30b0c7", "#0a84ff", "#5e5ce6", "#af52de", "#a2845e", "#8e8e93"];

export function VistaAjustes() {
  const { ajustes, guardarAjustes, salir } = useDatos();
  const [tema, setTema] = useTema();

  return (
    <>
      <Encabezado titulo="Ajustes" />
      <div className="grid grid-cols-1 gap-4">
        <ElegirFondo />

        <Tarjeta className="grid gap-3">
          <h2 className="text-[17px] font-bold">Notificaciones</h2>
          <Notificaciones />
        </Tarjeta>

        <Tarjeta className="grid gap-4">
          <h2 className="text-[17px] font-bold">Recordatorios</h2>
          <label className="flex items-center justify-between gap-3 text-[15px]">
            Hora de las tareas sin horario
            <input
              type="time"
              value={ajustes.horaTareas}
              onChange={(e) => e.target.value && guardarAjustes({ horaTareas: e.target.value })}
              className={CAMPO_HORA}
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-[15px]">
            <span>
              Resumen del día
              <span className="block text-[13px] text-tinta-tenue">Actividades y hábitos de hoy.</span>
            </span>
            <input
              type="checkbox"
              checked={ajustes.resumenDiario}
              onChange={(e) => guardarAjustes({ resumenDiario: e.target.checked })}
              className="size-5 accent-[var(--color-acento)]"
            />
          </label>
          {ajustes.resumenDiario && (
            <label className="flex items-center justify-between gap-3 text-[15px]">
              A las
              <input
                type="time"
                value={ajustes.horaResumen}
                onChange={(e) => e.target.value && guardarAjustes({ horaResumen: e.target.value })}
                className={CAMPO_HORA}
              />
            </label>
          )}
          <label className="flex items-center justify-between gap-3 text-[15px]">
            <span>
              Resumen semanal
              <span className="block text-[13px] text-tinta-tenue">Domingo a las 21:00: cómo te fue y a planificar la próxima.</span>
            </span>
            <input
              type="checkbox"
              checked={ajustes.resumenSemanal}
              onChange={(e) => guardarAjustes({ resumenSemanal: e.target.checked })}
              className="size-5 accent-[var(--color-acento)]"
            />
          </label>
        </Tarjeta>

        <Categorias />

        <Tarjeta className="grid gap-3">
          <h2 className="text-[17px] font-bold">Tema</h2>
          <Segmentos<Preferencia>
            etiqueta="Tema"
            opciones={[
              ["auto", "Oscuro"],
              ["claro", "Claro"],
            ]}
            valor={tema}
            onCambiar={setTema}
          />
          <p className="text-[13px] text-tinta-tenue">El vidrio oscuro es el predeterminado. Se guarda en este dispositivo.</p>
        </Tarjeta>

        {salir && (
          <Boton variante="secundario" onClick={salir}>
            Cerrar sesión
          </Boton>
        )}
      </div>
    </>
  );
}

function Categorias() {
  const { categorias, guardarCategoria, borrarCategoria, actividades, habitos } = useDatos();
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [borrando, setBorrando] = useState<Categoria | null>(null);
  const [error, setError] = useState("");

  function guardar() {
    if (!editando) return;
    const nombre = editando.nombre.trim();
    if (!nombre) return setError("Poné un nombre.");
    if (categorias.some((c) => c.id !== editando.id && c.nombre.toLowerCase() === nombre.toLowerCase()))
      return setError("Ya hay una categoría con ese nombre.");
    guardarCategoria({ ...editando, nombre });
    setEditando(null);
    setError("");
  }

  async function borrar(c: Categoria) {
    try {
      await borrarCategoria(c.id);
      setBorrando(null);
    } catch {
      setError("No pude borrarla. Revisá la conexión.");
    }
  }

  return (
    <Tarjeta className="grid gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[17px] font-bold">Categorías</h2>
        <button
          type="button"
          onClick={() => setEditando({ id: nuevoId(), nombre: "", color: COLORES[categorias.length % COLORES.length], orden: categorias.length })}
          className="text-[15px] font-semibold text-acento"
        >
          Nueva
        </button>
      </div>
      <ul className="grid gap-1">
        {categorias.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-1.5">
            <span className="size-4 rounded-full" style={{ background: c.color }} aria-hidden="true" />
            <span className="flex-1 text-[15px]">{c.nombre}</span>
            <button type="button" onClick={() => setEditando(c)} className="text-[14px] font-semibold text-acento">
              Editar
            </button>
            <button type="button" onClick={() => setBorrando(c)} className="text-[14px] font-semibold text-rojo">
              Borrar
            </button>
          </li>
        ))}
      </ul>
      {editando && (
        <div className="grid gap-3 rounded-2xl bg-tinta/[0.04] p-3">
          <input
            autoFocus
            value={editando.nombre}
            maxLength={40}
            onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
            placeholder="Nombre"
            className={CAMPO}
          />
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color">
            {COLORES.map((color) => (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={editando.color === color}
                aria-label={color}
                onClick={() => setEditando({ ...editando, color })}
                className="size-9 rounded-full ring-offset-2 ring-offset-fondo"
                style={{ background: color, boxShadow: editando.color === color ? `0 0 0 3px var(--color-fondo), 0 0 0 5px ${color}` : undefined }}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Boton variante="secundario" onClick={() => (setEditando(null), setError(""))}>
              Volver
            </Boton>
            <Boton onClick={guardar}>Guardar</Boton>
          </div>
        </div>
      )}
      {borrando && (
        <div className="grid gap-2 rounded-2xl bg-rojo/10 p-3 text-[14px]">
          <p>
            Se borra «{borrando.nombre}». Sus {actividades.filter((a) => a.categoriaId === borrando.id).length} actividades y{" "}
            {habitos.filter((h) => h.categoriaId === borrando.id).length} hábitos quedan sin categoría (no se borran).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Boton variante="secundario" onClick={() => setBorrando(null)}>
              Volver
            </Boton>
            <Boton variante="peligro" onClick={() => borrar(borrando)}>
              Borrar
            </Boton>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-[14px] text-rojo">
          {error}
        </p>
      )}
    </Tarjeta>
  );
}

/** Cargar una imagen propia de fondo (se achica antes de subirla) o volver al fondo ambiental. */
function ElegirFondo() {
  const { ajustes, guardarAjustes, repo } = useDatos();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function cargar(archivo: File | undefined) {
    if (!archivo) return;
    setOcupado(true);
    setError("");
    try {
      const imagen = await achicarImagen(archivo);
      const url = await repo.subirFondo(imagen);
      const anterior = ajustes.fondo;
      guardarAjustes({ fondo: url });
      if (anterior) void repo.borrarFondo(anterior).catch(() => {});
    } catch (fallo) {
      setError(
        fallo instanceof Error && fallo.message === "No es una imagen."
          ? "Ese archivo no es una imagen."
          : "No pude subir la imagen. Revisá la conexión (y que esté corrido el SQL nuevo de RHA) y probá de nuevo.",
      );
    } finally {
      setOcupado(false);
    }
  }

  function quitar() {
    const anterior = ajustes.fondo;
    guardarAjustes({ fondo: null });
    if (anterior) void repo.borrarFondo(anterior).catch(() => {});
  }

  return (
    <Tarjeta className="grid gap-3">
      <h2 className="text-[17px] font-bold">Fondo</h2>
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xl border border-linea bg-tinta/5">
          {ajustes.fondo ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista previa de la imagen del usuario
            <img src={ajustes.fondo} alt="Fondo actual" className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center px-1 text-center text-[11px] text-tinta-tenue">Ambiental</span>
          )}
        </div>
        <div className="grid min-w-0 gap-2">
          <p className="text-[14px] text-tinta-suave">
            {ajustes.fondo
              ? "Tu imagen, con un velo para que se lea todo. Se ve igual en SIVA y en tus otros dispositivos."
              : "El fondo ambiental. Podés poner una foto tuya."}
          </p>
          <div className="flex flex-wrap gap-2">
            <label
              className={`inline-flex h-10 cursor-pointer items-center rounded-full bg-acento px-4 text-[15px] font-semibold text-sobre-acento ${ocupado ? "opacity-60" : ""}`}
            >
              {ocupado ? "Subiendo…" : ajustes.fondo ? "Cambiar imagen" : "Cargar imagen"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={ocupado}
                onChange={(e) => {
                  void cargar(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {ajustes.fondo && (
              <Boton variante="secundario" className="h-10 text-[15px]" onClick={quitar} disabled={ocupado}>
                Quitar
              </Boton>
            )}
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-[14px] text-rojo">
          {error}
        </p>
      )}
    </Tarjeta>
  );
}
