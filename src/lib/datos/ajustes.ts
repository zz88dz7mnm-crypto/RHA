import { AJUSTES_INICIALES, type Ajustes } from "../tipos";

const hora = (h: string | null | undefined) => (h ? h.slice(0, 5) : null);

/**
 * La fila de rha_ajustes como Ajustes. Lo que falte (porque todavía no se corrió el SQL nuevo)
 * toma el valor inicial: la app sigue andando con la base vieja.
 */
export function ajustesDeFila(f: Record<string, unknown>): Ajustes {
  const si = (k: string, inicial: boolean) => (typeof f[k] === "boolean" ? (f[k] as boolean) : inicial);
  const i = AJUSTES_INICIALES;
  return {
    horaTareas: hora(f.hora_tareas as string) ?? i.horaTareas,
    resumenDiario: si("resumen_diario", i.resumenDiario),
    horaResumen: hora(f.hora_resumen as string) ?? i.horaResumen,
    resumenSemanal: si("resumen_semanal", i.resumenSemanal),
    horaSemanal: hora(f.hora_semanal as string) ?? i.horaSemanal,
    avisosActividades: si("avisos_actividades", i.avisosActividades),
    avisosHabitos: si("avisos_habitos", i.avisosHabitos),
    avisosSuplementos: si("avisos_suplementos", i.avisosSuplementos),
    silencioDesde: hora(f.silencio_desde as string),
    silencioHasta: hora(f.silencio_hasta as string),
    fondo: (f.fondo as string | null | undefined) ?? null,
  };
}

const COLUMNAS: Record<keyof Ajustes, string> = {
  horaTareas: "hora_tareas",
  resumenDiario: "resumen_diario",
  horaResumen: "hora_resumen",
  resumenSemanal: "resumen_semanal",
  horaSemanal: "hora_semanal",
  avisosActividades: "avisos_actividades",
  avisosHabitos: "avisos_habitos",
  avisosSuplementos: "avisos_suplementos",
  silencioDesde: "silencio_desde",
  silencioHasta: "silencio_hasta",
  fondo: "fondo",
};

/** Solo las columnas que cambian. */
export function filaDeAjustes(cambios: Partial<Ajustes>): Record<string, unknown> {
  const fila: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cambios)) if (v !== undefined && k in COLUMNAS) fila[COLUMNAS[k as keyof Ajustes]] = v;
  return fila;
}
