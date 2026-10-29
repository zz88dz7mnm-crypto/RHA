"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ErrorDeDatos, type Repositorio } from "./datos/repositorio";
import { hoyEn } from "./fechas";
import { CATEGORIAS_INICIALES } from "./sugeridos";
import type { Actividad, Ajustes, Categoria, EstadoRegistro, Habito, Pausa, Registro } from "./tipos";

type Datos = { ajustes: Ajustes; categorias: Categoria[]; actividades: Actividad[]; habitos: Habito[]; pausas: Pausa[]; registros: Registro[] };
type Carga = { estado: "cargando" } | { estado: "error"; mensaje: string } | ({ estado: "lista" } & Datos);

type Acciones = {
  hoy: string;
  repo: Repositorio;
  pendientes: number;
  reintentar(): void;
  recargar(): void;
  salir?: () => void;
  guardarActividades(lista: Actividad[]): void;
  borrarActividades(ids: string[]): void;
  guardarHabitos(lista: Habito[]): void;
  borrarHabito(id: string): Promise<void>;
  pausar(habito: Habito): void;
  retomar(habito: Habito): void;
  /** `null` borra el registro del día (vuelve a "sin marcar"). */
  /** `valor`: lo medido (el peso). Sin pasarlo, se conserva el que había. */
  marcar(habitoId: string, fecha: string, estado: EstadoRegistro | null, valor?: number | null): void;
  guardarCategoria(c: Categoria): void;
  borrarCategoria(id: string): Promise<void>;
  guardarAjustes(cambios: Partial<Ajustes>): void;
};

const Contexto = createContext<{ carga: Carga; acciones: Acciones } | null>(null);
export const nuevoId = () => crypto.randomUUID();

function mensajeDeError(fallo: unknown): string {
  if (fallo instanceof ErrorDeDatos && fallo.baseDesactualizada) {
    return "Falta preparar la base de datos: pegá el archivo supabase/schema.sql en el SQL Editor de Supabase y recargá.";
  }
  return "No pude traer tu agenda. Revisá la conexión y probá de nuevo.";
}

export function ProveedorRha({ repo, salir, children }: { repo: Repositorio; salir?: () => void; children: React.ReactNode }) {
  const [carga, setCarga] = useState<Carga>({ estado: "cargando" });
  const [hoy, setHoy] = useState(() => hoyEn());
  const [version, setVersion] = useState(0);
  const fallidos = useRef(new Map<string, () => Promise<void>>());
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    let vigente = true;
    (async () => {
      const [ajustes, categoriasGuardadas, actividades, habitos, pausas, registros] = await Promise.all([
        repo.ajustes(),
        repo.categorias(),
        repo.actividades(),
        repo.habitos(),
        repo.pausas(),
        repo.registros(),
      ]);
      // La primera vez se crean las categorías de arranque (después se pueden cambiar).
      let categorias = categoriasGuardadas;
      if (!categorias.length) {
        categorias = CATEGORIAS_INICIALES.map((c, orden) => ({ id: nuevoId(), nombre: c.nombre, color: c.color, orden }));
        for (const c of categorias) await repo.guardarCategoria(c);
      }
      if (vigente) setCarga({ estado: "lista", ajustes, categorias, actividades, habitos, pausas, registros });
    })().catch((fallo) => vigente && setCarga({ estado: "error", mensaje: mensajeDeError(fallo) }));
    return () => {
      vigente = false;
    };
  }, [repo, version]);

  useEffect(() => {
    const id = setInterval(() => setHoy(hoyEn()), 60_000);
    return () => clearInterval(id);
  }, []);

  const cambiar = useCallback((f: (d: Datos) => Datos) => setCarga((c) => (c.estado === "lista" ? { estado: "lista", ...f(c) } : c)), []);

  /** Ejecuta un guardado; si falla, queda anotado para reintentar. La pantalla ya muestra el cambio. */
  const persistir = useCallback((clave: string, operacion: () => Promise<void>) => {
    fallidos.current.delete(clave);
    setPendientes(fallidos.current.size);
    operacion().catch(() => {
      fallidos.current.set(clave, operacion);
      setPendientes(fallidos.current.size);
    });
  }, []);

  const reintentar = useCallback(() => {
    const lista = [...fallidos.current.entries()];
    fallidos.current.clear();
    setPendientes(0);
    // Primero categorías y hábitos, después lo que depende de ellos.
    const prioridad = (clave: string) => (clave.startsWith("cat") ? 0 : clave.startsWith("hab") ? 1 : 2);
    lista.sort(([a], [b]) => prioridad(a) - prioridad(b));
    (async () => {
      for (const [clave, operacion] of lista) {
        try {
          await operacion();
        } catch {
          fallidos.current.set(clave, operacion);
        }
      }
      setPendientes(fallidos.current.size);
    })();
  }, []);

  useEffect(() => {
    window.addEventListener("online", reintentar);
    return () => window.removeEventListener("online", reintentar);
  }, [reintentar]);

  const reemplazar = <T extends { id: string }>(lista: T[], nuevos: T[]) => [...lista.filter((x) => !nuevos.some((n) => n.id === x.id)), ...nuevos];

  const acciones = useMemo<Acciones>(() => {
    const pausasActuales = carga.estado === "lista" ? carga.pausas : [];
    return {
      hoy,
      repo,
      pendientes,
      reintentar,
      salir,
      recargar: () => {
        setCarga({ estado: "cargando" });
        setVersion((v) => v + 1);
      },

      guardarActividades(lista) {
        cambiar((d) => ({ ...d, actividades: reemplazar(d.actividades, lista) }));
        persistir(`act:${lista.map((a) => a.id).join(",")}`, () => repo.guardarActividades(lista));
      },

      borrarActividades(ids) {
        cambiar((d) => ({ ...d, actividades: d.actividades.filter((a) => !ids.includes(a.id)) }));
        for (const id of ids) fallidos.current.delete(`act:${id}`);
        persistir(`act-borrar:${ids.join(",")}`, () => repo.borrarActividades(ids));
      },

      guardarHabitos(lista) {
        cambiar((d) => ({ ...d, habitos: reemplazar(d.habitos, lista) }));
        persistir(`hab:${lista.map((h) => h.id).join(",")}`, () => repo.guardarHabitos(lista));
      },

      async borrarHabito(id) {
        await repo.borrarHabito(id);
        cambiar((d) => ({
          ...d,
          habitos: d.habitos.filter((h) => h.id !== id),
          registros: d.registros.filter((r) => r.habitoId !== id),
          pausas: d.pausas.filter((p) => p.habitoId !== id),
        }));
      },

      pausar(habito) {
        const pausa: Pausa = { id: nuevoId(), habitoId: habito.id, desde: hoy, hasta: null };
        const pausado = { ...habito, estado: "pausado" as const };
        cambiar((d) => ({ ...d, habitos: reemplazar(d.habitos, [pausado]), pausas: [...d.pausas, pausa] }));
        persistir(`hab:${habito.id}`, async () => {
          await repo.guardarHabitos([pausado]);
          await repo.guardarPausa(pausa);
        });
      },

      retomar(habito) {
        const abierta = pausasActuales.find((p) => p.habitoId === habito.id && p.hasta === null);
        const cerrada = abierta ? { ...abierta, hasta: hoy } : null;
        const activo = { ...habito, estado: "activo" as const };
        cambiar((d) => ({ ...d, habitos: reemplazar(d.habitos, [activo]), pausas: cerrada ? reemplazar(d.pausas, [cerrada]) : d.pausas }));
        persistir(`hab:${habito.id}`, async () => {
          await repo.guardarHabitos([activo]);
          if (cerrada) await repo.guardarPausa(cerrada);
        });
      },

      marcar(habitoId, fecha, estado, valor) {
        const previo = carga.estado === "lista" ? carga.registros.find((r) => r.habitoId === habitoId && r.fecha === fecha) : undefined;
        const clave = `reg:${habitoId}:${fecha}`;
        if (estado === null) {
          cambiar((d) => ({ ...d, registros: d.registros.filter((r) => !(r.habitoId === habitoId && r.fecha === fecha)) }));
          persistir(clave, () => repo.borrarRegistro(habitoId, fecha));
          return;
        }
        const r: Registro = { habitoId, fecha, estado, nota: previo?.nota ?? "", valor: valor === undefined ? (previo?.valor ?? null) : valor };
        cambiar((d) => ({ ...d, registros: [...d.registros.filter((x) => !(x.habitoId === habitoId && x.fecha === fecha)), r] }));
        persistir(clave, () => repo.guardarRegistro(r));
      },

      guardarCategoria(c) {
        cambiar((d) => ({ ...d, categorias: reemplazar(d.categorias, [c]).sort((a, b) => a.orden - b.orden) }));
        persistir(`cat:${c.id}`, () => repo.guardarCategoria(c));
      },

      async borrarCategoria(id) {
        await repo.borrarCategoria(id);
        cambiar((d) => ({
          ...d,
          categorias: d.categorias.filter((c) => c.id !== id),
          actividades: d.actividades.map((a) => (a.categoriaId === id ? { ...a, categoriaId: null } : a)),
          habitos: d.habitos.map((h) => (h.categoriaId === id ? { ...h, categoriaId: null } : h)),
        }));
      },

      guardarAjustes(cambios) {
        cambiar((d) => ({ ...d, ajustes: { ...d.ajustes, ...cambios } }));
        persistir(`ajustes:${Object.keys(cambios).join(",")}`, () => repo.guardarAjustes(cambios));
      },
    };
  }, [hoy, repo, pendientes, reintentar, salir, carga, cambiar, persistir]);

  return <Contexto.Provider value={{ carga, acciones }}>{children}</Contexto.Provider>;
}

export function useRha() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useRha fuera de ProveedorRha");
  return valor;
}

export function useDatos(): Datos & Acciones {
  const { carga, acciones } = useRha();
  if (carga.estado !== "lista") throw new Error("Datos todavía no cargados");
  return { ...carga, ...acciones };
}
