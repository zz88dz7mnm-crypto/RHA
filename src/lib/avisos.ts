/**
 * Qué notificaciones corresponde mandar en una ventana de tiempo. Código puro: el servidor
 * lo llama cada minuto con la ventana (desde, hasta] en hora local, y cada aviso tiene una
 * clave única para no mandarlo dos veces aunque la ventana se repita.
 */
import { aMinutos, delDia, deMinutos } from "./agenda";
import { lunesDe, sumarDias } from "./fechas";
import { adherencia, avanceSemanal, programadoEn, registroDe } from "./habitos";
import type { Actividad, Ajustes, Habito, Pausa, Registro } from "./tipos";

export type Aviso = { clave: string; titulo: string; cuerpo: string; url: string };

export type DatosAvisos = { actividades: Actividad[]; habitos: Habito[]; pausas: Pausa[]; registros: Registro[]; ajustes: Ajustes };

/** "AAAA-MM-DDTHH:MM" de una fecha más una cantidad de minutos (puede pasar al día anterior o siguiente). */
export function momento(fecha: string, minutos: number): string {
  const dias = Math.floor(minutos / 1440);
  return `${sumarDias(fecha, dias)}T${deMinutos(((minutos % 1440) + 1440) % 1440)}`;
}

/** Instante local "AAAA-MM-DDTHH:MM" en la zona dada. */
export function localEn(zona: string, instante: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zona,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instante)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

const enVentana = (m: string, desde: string, hasta: string) => m > desde && m <= hasta;

export function avisosPendientes(d: DatosAvisos, desde: string, hasta: string): Aviso[] {
  const avisos: { m: string; aviso: Aviso }[] = [];
  const fechas = [...new Set([sumarDias(desde.slice(0, 10), -1), desde.slice(0, 10), hasta.slice(0, 10), sumarDias(hasta.slice(0, 10), 1)])];

  for (const a of d.actividades) {
    if (a.estado !== "pendiente" || a.recordatorio === null || !fechas.includes(a.fecha)) continue;
    const m = a.inicio ? momento(a.fecha, aMinutos(a.inicio) - a.recordatorio) : momento(a.fecha, aMinutos(d.ajustes.horaTareas));
    if (!enVentana(m, desde, hasta)) continue;
    const cuando = a.inicio ? (a.recordatorio === 0 ? `Ahora, ${a.inicio}` : `A las ${a.inicio} (en ${a.recordatorio} min)`) : "Tarea para hoy";
    avisos.push({ m, aviso: { clave: `act:${a.id}:${m}`, titulo: a.titulo, cuerpo: cuando, url: "/" } });
  }

  for (const fecha of fechas) {
    for (const h of d.habitos) {
      if (h.estado !== "activo" || !h.hora || !programadoEn(h, fecha, d.pausas)) continue;
      const m = momento(fecha, aMinutos(h.hora));
      if (!enVentana(m, desde, hasta)) continue;
      if (registroDe(d.registros, h.id, fecha)?.estado === "completado") continue;
      if (h.tipo === "semanal" && avanceSemanal(h, d.registros, fecha).cumplida) continue;
      const cuerpo = h.suplemento
        ? "¿Ya lo tomaste?"
        : h.tipo === "semanal"
          ? `${avanceSemanal(h, d.registros, fecha).hechas} de ${h.metaSemanal} esta semana`
          : "Hábito de hoy";
      avisos.push({ m, aviso: { clave: `hab:${h.id}:${fecha}`, titulo: h.nombre, cuerpo, url: "/" } });
    }

    if (d.ajustes.resumenDiario) {
      const m = momento(fecha, aMinutos(d.ajustes.horaResumen));
      if (enVentana(m, desde, hasta)) {
        const actividades = delDia(d.actividades, fecha).filter((a) => a.estado === "pendiente");
        const habitos = d.habitos.filter((h) => h.estado === "activo" && h.tipo === "dias" && programadoEn(h, fecha, d.pausas));
        const primera = actividades.find((a) => a.inicio);
        const partes = [
          actividades.length ? `${actividades.length} ${actividades.length === 1 ? "actividad" : "actividades"}` : "sin actividades",
          `${habitos.length} ${habitos.length === 1 ? "hábito" : "hábitos"}`,
        ];
        avisos.push({
          m,
          aviso: {
            clave: `dia:${fecha}`,
            titulo: "Tu día",
            cuerpo: `Hoy: ${partes.join(" y ")}.${primera ? ` Primero: ${primera.titulo} a las ${primera.inicio}.` : ""}`,
            url: "/",
          },
        });
      }
    }

    // Resumen semanal: domingo a las 21:00.
    if (d.ajustes.resumenSemanal && lunesDe(fecha) === sumarDias(fecha, -6)) {
      const m = momento(fecha, 21 * 60);
      if (enVentana(m, desde, hasta)) {
        const lunes = lunesDe(fecha);
        let completados = 0;
        let programados = 0;
        for (const h of d.habitos.filter((x) => x.estado !== "archivado" && x.tipo === "dias")) {
          const r = adherencia(h, d.registros, d.pausas, lunes, fecha, fecha);
          completados += r.completados;
          programados += r.programados;
        }
        const semana = d.actividades.filter((a) => a.fecha >= lunes && a.fecha <= fecha);
        const hechas = semana.filter((a) => a.estado === "completada").length;
        const cuerpo = `Hábitos: ${completados} de ${programados}. Actividades completadas: ${hechas} de ${semana.filter((a) => a.estado !== "cancelada").length}. Tocá para ver la semana y planificar la próxima.`;
        avisos.push({ m, aviso: { clave: `semana:${lunes}`, titulo: "Tu semana", cuerpo, url: "/semana" } });
      }
    }
  }

  return avisos.sort((a, b) => a.m.localeCompare(b.m)).map((x) => x.aviso);
}
