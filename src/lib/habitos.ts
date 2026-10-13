/**
 * Las cuentas de hábitos. Código puro.
 * - Un hábito de días fijos se espera en esos días; uno semanal, N veces en la semana (lunes a domingo).
 * - Los días en pausa no cuentan como incumplimiento.
 * - Hoy cuenta solo si ya se registró: el día no terminó.
 */
import { lunesDe, sumarDias } from "./fechas";
import type { Habito, Pausa, Registro } from "./tipos";

/** 1 = lunes … 7 = domingo. */
export function diaDeSemana(fecha: string): number {
  const [a, m, d] = fecha.split("-").map(Number);
  const dow = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

export function enPausa(habitoId: string, fecha: string, pausas: Pausa[]): boolean {
  return pausas.some((p) => p.habitoId === habitoId && p.desde <= fecha && (p.hasta === null || fecha < p.hasta));
}

/** ¿Se espera el hábito ese día? Para los semanales, cualquier día de la semana es válido. */
export function programadoEn(h: Habito, fecha: string, pausas: Pausa[]): boolean {
  if (h.estado === "archivado" || fecha < h.desde || enPausa(h.id, fecha, pausas)) return false;
  return h.tipo === "semanal" || h.dias.includes(diaDeSemana(fecha));
}

export function registroDe(registros: Registro[], habitoId: string, fecha: string): Registro | undefined {
  return registros.find((r) => r.habitoId === habitoId && r.fecha === fecha);
}

export type Adherencia = { completados: number; parciales: number; programados: number };

/**
 * Para hábitos de días fijos: de los días programados en el rango, cuántos se completaron.
 * Los días futuros no cuentan; hoy, solo si ya tiene registro.
 */
export function adherencia(h: Habito, registros: Registro[], pausas: Pausa[], desde: string, hasta: string, hoy: string): Adherencia {
  const r: Adherencia = { completados: 0, parciales: 0, programados: 0 };
  for (let d = desde; d <= hasta && d <= hoy; d = sumarDias(d, 1)) {
    if (!programadoEn(h, d, pausas)) continue;
    const reg = registroDe(registros, h.id, d);
    if (d === hoy && !reg) continue;
    r.programados += 1;
    if (reg?.estado === "completado") r.completados += 1;
    if (reg?.estado === "parcial") r.parciales += 1;
  }
  return r;
}

/** Para hábitos semanales: cuántas veces se hizo en la semana de `fecha`, contra la meta. */
export function avanceSemanal(h: Habito, registros: Registro[], fecha: string): { hechas: number; meta: number; cumplida: boolean } {
  const lunes = lunesDe(fecha);
  const domingo = sumarDias(lunes, 6);
  const hechas = registros.filter((r) => r.habitoId === h.id && r.estado === "completado" && r.fecha >= lunes && r.fecha <= domingo).length;
  const meta = h.metaSemanal ?? 1;
  return { hechas, meta, cumplida: hechas >= meta };
}

/**
 * Racha actual. Días fijos: días programados seguidos completados, hacia atrás desde hoy
 * (hoy suma si está hecho y no corta si todavía no). Semanal: semanas seguidas con la meta cumplida
 * (la semana actual suma si ya se cumplió). Las pausas se saltean.
 */
export function racha(h: Habito, registros: Registro[], pausas: Pausa[], hoy: string): { valor: number; unidad: "días" | "semanas" } {
  if (h.tipo === "semanal") {
    let valor = 0;
    let lunes = lunesDe(hoy);
    if (avanceSemanal(h, registros, lunes).cumplida) valor += 1;
    lunes = sumarDias(lunes, -7);
    for (let i = 0; i < 520 && sumarDias(lunes, 6) >= h.desde; i++, lunes = sumarDias(lunes, -7)) {
      // Una semana entera en pausa no corta ni suma.
      const toda = Array.from({ length: 7 }, (_, k) => sumarDias(lunes, k)).every((d) => enPausa(h.id, d, pausas));
      if (toda) continue;
      if (!avanceSemanal(h, registros, lunes).cumplida) break;
      valor += 1;
    }
    return { valor, unidad: "semanas" };
  }
  let valor = 0;
  for (let d = hoy, i = 0; d >= h.desde && i < 3650; d = sumarDias(d, -1), i++) {
    if (!programadoEn(h, d, pausas)) continue;
    const estado = registroDe(registros, h.id, d)?.estado;
    if (estado === "completado") valor += 1;
    else if (d === hoy && !estado) continue;
    else break;
  }
  return { valor, unidad: "días" };
}

/** "Lun, Mié y Vie", "Todos los días", "3 veces por semana". */
export function textoFrecuencia(h: Pick<Habito, "tipo" | "dias" | "metaSemanal">): string {
  if (h.tipo === "semanal") return h.metaSemanal === 1 ? "1 vez por semana" : `${h.metaSemanal ?? 1} veces por semana`;
  const dias = [...h.dias].sort();
  if (dias.length === 7) return "Todos los días";
  if (dias.join() === "1,2,3,4,5") return "De lunes a viernes";
  if (dias.join() === "6,7") return "Fines de semana";
  const nombres = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const lista = dias.map((d) => nombres[d - 1]);
  return lista.length <= 1 ? lista.join("") : `${lista.slice(0, -1).join(", ")} y ${lista.at(-1)}`;
}
