import { lunesDe, sumarDias } from "../fechas";
import { CATEGORIAS_INICIALES, SUGERIDOS } from "../sugeridos";
import { AJUSTES_INICIALES, type Actividad, type Ajustes, type Categoria, type Habito, type Pausa, type Registro } from "../tipos";
import type { Repositorio } from "./repositorio";

type Estado = { ajustes: Ajustes; categorias: Categoria[]; actividades: Actividad[]; habitos: Habito[]; pausas: Pausa[]; registros: Registro[] };

/** Repositorio en memoria, para pruebas y demo. Copia todo al entrar y al salir, como una base. */
export function repositorioEnMemoria(inicial?: Partial<Estado>): Repositorio {
  const e: Estado = { ajustes: AJUSTES_INICIALES, categorias: [], actividades: [], habitos: [], pausas: [], registros: [], ...structuredClone(inicial ?? {}) };
  const c = <T>(x: T): T => structuredClone(x);
  const reemplazar = <T extends { id: string }>(lista: T[], nuevos: T[]) => [...lista.filter((x) => !nuevos.some((n) => n.id === x.id)), ...c(nuevos)];
  return {
    ajustes: async () => c(e.ajustes),
    guardarAjustes: async (x) => void (e.ajustes = { ...e.ajustes, ...x }),
    subirFondo: async (imagen) => URL.createObjectURL(imagen),
    borrarFondo: async () => {},
    categorias: async () => c(e.categorias),
    guardarCategoria: async (x) => void (e.categorias = reemplazar(e.categorias, [x])),
    borrarCategoria: async (id) => {
      e.categorias = e.categorias.filter((x) => x.id !== id);
      e.actividades = e.actividades.map((a) => (a.categoriaId === id ? { ...a, categoriaId: null } : a));
      e.habitos = e.habitos.map((h) => (h.categoriaId === id ? { ...h, categoriaId: null } : h));
    },
    actividades: async () => c(e.actividades),
    guardarActividades: async (lista) => void (e.actividades = reemplazar(e.actividades, lista)),
    borrarActividades: async (ids) => void (e.actividades = e.actividades.filter((a) => !ids.includes(a.id))),
    habitos: async () => c(e.habitos),
    guardarHabitos: async (lista) => void (e.habitos = reemplazar(e.habitos, lista)),
    borrarHabito: async (id) => {
      e.habitos = e.habitos.filter((h) => h.id !== id);
      e.registros = e.registros.filter((r) => r.habitoId !== id);
      e.pausas = e.pausas.filter((p) => p.habitoId !== id);
    },
    pausas: async () => c(e.pausas),
    guardarPausa: async (p) => void (e.pausas = reemplazar(e.pausas, [p])),
    registros: async () => c(e.registros),
    guardarRegistro: async (r) => void (e.registros = [...e.registros.filter((x) => !(x.habitoId === r.habitoId && x.fecha === r.fecha)), c(r)]),
    borrarRegistro: async (habitoId, fecha) => void (e.registros = e.registros.filter((x) => !(x.habitoId === habitoId && x.fecha === fecha))),
    guardarSuscripcion: async () => {},
    borrarSuscripcion: async () => {},
  };
}

/** Dos semanas inventadas para ver la app con datos (solo demo). */
export function datosDeMuestra(hoy: string): Estado {
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const categorias = CATEGORIAS_INICIALES.map((x, i) => ({ id: id(100 + i), nombre: x.nombre, color: x.color, orden: i }));
  const cat = (nombre: string) => categorias.find((x) => x.nombre === nombre)!.id;
  const lunes = lunesDe(hoy);
  const desde = sumarDias(lunes, -14);
  const h = (n: number, cambios: Partial<Habito>): Habito => ({
    id: id(200 + n),
    nombre: "",
    tipo: "dias",
    dias: [1, 2, 3, 4, 5, 6, 7],
    metaSemanal: null,
    categoriaId: null,
    suplemento: false,
    hora: null,
    medicion: null,
    estado: "activo",
    desde,
    orden: n,
    ...cambios,
  });
  // Los hábitos de la lista del usuario, con dos semanas de registros inventados.
  const habitos = SUGERIDOS.map((x, i) =>
    h(i + 1, {
      nombre: x.nombre,
      tipo: x.tipo,
      dias: x.dias,
      metaSemanal: x.metaSemanal,
      suplemento: x.suplemento,
      hora: x.hora,
      medicion: x.medicion,
      categoriaId: cat(x.categoria),
    }),
  );
  const registros: Registro[] = [];
  for (let d = desde, i = 0; d < hoy; d = sumarDias(d, 1), i++) {
    const dow = ((new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
    for (const x of habitos) {
      if (x.medicion === "peso") {
        if (dow === 7) registros.push({ habitoId: x.id, fecha: d, estado: "completado", nota: "", valor: Math.round((76.2 + i * 0.05) * 10) / 10 });
        continue;
      }
      if (x.tipo === "dias" && !x.dias.includes(dow)) continue;
      if (x.tipo === "semanal" && ![1, 3, 5].includes(dow) && !(x.metaSemanal! >= 5 && dow <= 5)) continue;
      if ((i + x.orden) % 5 === 0) continue;
      registros.push({ habitoId: x.id, fecha: d, estado: (i + x.orden) % 7 === 0 ? "parcial" : "completado", nota: "", valor: null });
    }
  }
  const a = (n: number, cambios: Partial<Actividad>): Actividad => ({
    id: id(300 + n),
    titulo: "",
    fecha: hoy,
    inicio: null,
    fin: null,
    categoriaId: null,
    prioridad: "media",
    estado: "pendiente",
    notas: "",
    recordatorio: null,
    serieId: null,
    ...cambios,
  });
  const actividades = [
    a(1, { titulo: "Gimnasio · Día A", inicio: "09:00", fin: "10:15", categoriaId: cat("Gimnasio"), estado: "completada" }),
    a(2, { titulo: "Estudiar matrices", inicio: "15:00", fin: "17:00", categoriaId: cat("Facultad"), recordatorio: 15 }),
    a(3, { titulo: "Clase de Álgebra", inicio: "18:00", fin: "20:00", categoriaId: cat("Facultad"), recordatorio: 30 }),
    a(4, { titulo: "Entregar TP de Física", categoriaId: cat("Facultad"), prioridad: "alta", recordatorio: 0 }),
    a(5, { titulo: "Comprar creatina", categoriaId: cat("Salud"), prioridad: "baja" }),
    a(6, { titulo: "Pagar la luz", fecha: sumarDias(hoy, -2), categoriaId: cat("Personal"), prioridad: "alta" }),
    a(7, { titulo: "Producir beat nuevo", fecha: sumarDias(hoy, 1), inicio: "21:00", fin: "23:00", categoriaId: cat("Personal") }),
    a(8, { titulo: "Gimnasio · Día B", fecha: sumarDias(hoy, 2), inicio: "09:00", fin: "10:15", categoriaId: cat("Gimnasio") }),
    a(9, { titulo: "Parcial de Álgebra", fecha: sumarDias(hoy, 4), inicio: "14:00", fin: "16:00", categoriaId: cat("Facultad"), prioridad: "alta" }),
  ];
  return { ajustes: AJUSTES_INICIALES, categorias, actividades, habitos, pausas: [], registros };
}
