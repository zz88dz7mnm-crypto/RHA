/** Las cuentas de la agenda. Código puro. */
import { sumarDias } from "./fechas";
import type { Actividad } from "./tipos";

export const aMinutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
};

export const deMinutos = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Ordena: primero las que tienen horario, por hora; después las tareas sin horario, por prioridad. */
export function ordenar(lista: Actividad[]): Actividad[] {
  const peso = { alta: 0, media: 1, baja: 2 };
  return [...lista].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    if (a.inicio && b.inicio) return a.inicio.localeCompare(b.inicio);
    if (a.inicio) return -1;
    if (b.inicio) return 1;
    return peso[a.prioridad] - peso[b.prioridad] || a.titulo.localeCompare(b.titulo);
  });
}

export function delDia(actividades: Actividad[], fecha: string): Actividad[] {
  return ordenar(actividades.filter((a) => a.fecha === fecha && a.estado !== "cancelada"));
}

/** Pendientes cuya fecha ya pasó. No se reprograman solas: se muestran para que el usuario decida. */
export function vencidas(actividades: Actividad[], hoy: string): Actividad[] {
  return ordenar(actividades.filter((a) => a.estado === "pendiente" && a.fecha < hoy));
}

/** Fin efectivo: si no tiene, se toma una hora después del inicio (solo para detectar choques). */
function rango(a: Pick<Actividad, "inicio" | "fin">): [number, number] | null {
  if (!a.inicio) return null;
  const desde = aMinutos(a.inicio);
  const hasta = a.fin ? aMinutos(a.fin) : desde + 60;
  return [desde, Math.max(hasta, desde + 1)];
}

/** Las actividades del mismo día que se pisan en horario con `a`. Sirve para avisar; el usuario decide. */
export function solapamientos(a: Pick<Actividad, "id" | "fecha" | "inicio" | "fin">, actividades: Actividad[]): Actividad[] {
  const r = rango(a);
  if (!r) return [];
  return actividades.filter((otra) => {
    if (otra.id === a.id || otra.fecha !== a.fecha || otra.estado === "cancelada") return false;
    const o = rango(otra);
    return !!o && o[0] < r[1] && r[0] < o[1];
  });
}

/**
 * Propuesta para una vencida: hoy, a la misma hora si queda libre; si no, mañana.
 * Las tareas sin horario van a hoy. Es una propuesta: no se aplica sola.
 */
export function propuesta(a: Actividad, actividades: Actividad[], hoy: string): { fecha: string } {
  if (!a.inicio) return { fecha: hoy };
  for (const fecha of [hoy, sumarDias(hoy, 1), sumarDias(hoy, 2)]) {
    if (solapamientos({ ...a, fecha }, actividades).length === 0) return { fecha };
  }
  return { fecha: sumarDias(hoy, 1) };
}

/** Minutos planificados: suma de bloques con inicio y fin (no es tiempo real trabajado). */
export function minutosPlanificados(actividades: Actividad[]): number {
  return actividades
    .filter((a) => a.estado !== "cancelada" && a.inicio && a.fin)
    .reduce((total, a) => total + Math.max(0, aMinutos(a.fin!) - aMinutos(a.inicio!)), 0);
}

export function resumenDeTareas(actividades: Actividad[], desde: string, hasta: string, hoy: string) {
  const del = actividades.filter((a) => a.fecha >= desde && a.fecha <= hasta);
  return {
    completadas: del.filter((a) => a.estado === "completada").length,
    pendientes: del.filter((a) => a.estado === "pendiente" && a.fecha >= hoy).length,
    vencidas: del.filter((a) => a.estado === "pendiente" && a.fecha < hoy).length,
    canceladas: del.filter((a) => a.estado === "cancelada").length,
    minutos: minutosPlanificados(del),
  };
}

/** "2 h 30 min", "45 min". */
export function textoDuracion(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Fechas de una repetición semanal: la primera y luego cada 7 días hasta `hasta` (máximo 26 semanas). */
export function fechasRepetidas(desde: string, hasta: string): string[] {
  const lista: string[] = [];
  for (let d = desde, i = 0; d <= hasta && i < 26; d = sumarDias(d, 7), i++) lista.push(d);
  return lista;
}
