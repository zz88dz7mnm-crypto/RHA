import { describe, expect, it } from "vitest";
import { delDia, fechasRepetidas, minutosPlanificados, ordenar, propuesta, resumenDeTareas, solapamientos, textoDuracion, vencidas } from "./agenda";
import { avisosPendientes, enSilencio, localEn, momento } from "./avisos";
import { adherencia, avanceSemanal, diaDeSemana, enPausa, programadoEn, racha, textoFrecuencia } from "./habitos";
import { SUGERIDOS } from "./sugeridos";
import { AJUSTES_INICIALES, type Actividad, type Habito, type Pausa, type Registro } from "./tipos";

// 2026-10-12 es lunes.
const act = (id: string, cambios: Partial<Actividad> = {}): Actividad => ({
  id,
  titulo: id,
  fecha: "2026-10-12",
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
const hab = (id: string, cambios: Partial<Habito> = {}): Habito => ({
  id,
  nombre: id,
  tipo: "dias",
  dias: [1, 2, 3, 4, 5, 6, 7],
  metaSemanal: null,
  categoriaId: null,
  suplemento: false,
  hora: null,
  medicion: null,
  estado: "activo",
  desde: "2026-09-01",
  orden: 0,
  ...cambios,
});
const reg = (habitoId: string, fecha: string, estado: Registro["estado"] = "completado"): Registro => ({ habitoId, fecha, estado, nota: "", valor: null });

describe("hábitos", () => {
  it("sabe el día de la semana", () => {
    expect(diaDeSemana("2026-10-12")).toBe(1);
    expect(diaDeSemana("2026-10-18")).toBe(7);
  });

  it("programa por días fijos, desde su inicio, y respeta pausas y archivo", () => {
    const h = hab("h", { dias: [1, 3, 5], desde: "2026-10-05" });
    const pausas: Pausa[] = [{ id: "p", habitoId: "h", desde: "2026-10-14", hasta: "2026-10-16" }];
    expect(programadoEn(h, "2026-10-12", pausas)).toBe(true);
    expect(programadoEn(h, "2026-10-13", pausas)).toBe(false); // martes
    expect(programadoEn(h, "2026-10-14", pausas)).toBe(false); // en pausa
    expect(programadoEn(h, "2026-10-16", pausas)).toBe(true); // se retomó ese día
    expect(programadoEn(h, "2026-10-02", pausas)).toBe(false); // antes de empezar
    expect(programadoEn({ ...h, estado: "archivado" }, "2026-10-12", pausas)).toBe(false);
    expect(enPausa("h", "2026-10-15", pausas)).toBe(true);
  });

  it("calcula adherencia sin contar el futuro ni hoy sin registro", () => {
    const h = hab("h", { dias: [1, 2, 3, 4, 5] });
    const registros = [reg("h", "2026-10-05"), reg("h", "2026-10-06", "parcial"), reg("h", "2026-10-08")];
    // Semana del 5 al 11; hoy es miércoles 7 sin registro: cuentan lun y mar.
    expect(adherencia(h, registros, [], "2026-10-05", "2026-10-11", "2026-10-07")).toEqual({ completados: 1, parciales: 1, programados: 2 });
    // Hoy jueves 8 con registro: cuenta.
    expect(adherencia(h, registros, [], "2026-10-05", "2026-10-11", "2026-10-08")).toEqual({ completados: 2, parciales: 1, programados: 4 });
  });

  it("lleva la meta semanal", () => {
    const h = hab("g", { tipo: "semanal", dias: [], metaSemanal: 3 });
    const registros = [reg("g", "2026-10-12"), reg("g", "2026-10-14"), reg("g", "2026-10-11")];
    expect(avanceSemanal(h, registros, "2026-10-15")).toEqual({ hechas: 2, meta: 3, cumplida: false });
  });

  it("cuenta rachas diarias: hoy sin hacer no corta", () => {
    const h = hab("h");
    const registros = [reg("h", "2026-10-09"), reg("h", "2026-10-10"), reg("h", "2026-10-11")];
    expect(racha(h, registros, [], "2026-10-12")).toEqual({ valor: 3, unidad: "días" });
    expect(racha(h, [...registros, reg("h", "2026-10-12")], [], "2026-10-12").valor).toBe(4);
    expect(racha(h, [...registros, reg("h", "2026-10-12", "no_completado")], [], "2026-10-12").valor).toBe(0);
  });

  it("las pausas no cortan la racha", () => {
    const h = hab("h");
    const registros = [reg("h", "2026-10-07"), reg("h", "2026-10-11")];
    const pausas: Pausa[] = [{ id: "p", habitoId: "h", desde: "2026-10-08", hasta: "2026-10-11" }];
    expect(racha(h, registros, pausas, "2026-10-11").valor).toBe(2);
  });

  it("cuenta rachas semanales", () => {
    const h = hab("g", { tipo: "semanal", dias: [], metaSemanal: 2 });
    const registros = ["2026-09-28", "2026-09-30", "2026-10-05", "2026-10-07", "2026-10-12"].map((f) => reg("g", f));
    // Semana actual (12) con 1 de 2: no suma ni corta. Las dos anteriores cumplidas.
    expect(racha(h, registros, [], "2026-10-13")).toEqual({ valor: 2, unidad: "semanas" });
  });

  it("describe la frecuencia", () => {
    expect(textoFrecuencia({ tipo: "dias", dias: [1, 2, 3, 4, 5, 6, 7], metaSemanal: null })).toBe("Todos los días");
    expect(textoFrecuencia({ tipo: "dias", dias: [1, 2, 3, 4, 5], metaSemanal: null })).toBe("De lunes a viernes");
    expect(textoFrecuencia({ tipo: "dias", dias: [5, 1, 3], metaSemanal: null })).toBe("Lun, Mié y Vie");
    expect(textoFrecuencia({ tipo: "semanal", dias: [], metaSemanal: 3 })).toBe("3 veces por semana");
  });

  it("trae sugeridos válidos", () => {
    for (const s of SUGERIDOS) {
      expect(s.tipo === "semanal" ? s.metaSemanal! > 0 : s.dias.length > 0).toBe(true);
    }
  });
});

describe("agenda", () => {
  const lista = [
    act("tarea-baja", { prioridad: "baja" }),
    act("clase", { inicio: "18:00", fin: "20:00" }),
    act("gym", { inicio: "09:00", fin: "10:30" }),
    act("tarea-alta", { prioridad: "alta" }),
    act("cancelada", { estado: "cancelada", inicio: "18:30", fin: "19:00" }),
  ];

  it("ordena por hora y después las tareas sin horario por prioridad", () => {
    expect(ordenar(lista).map((a) => a.id)).toEqual(["gym", "clase", "cancelada", "tarea-alta", "tarea-baja"]);
    expect(delDia(lista, "2026-10-12").map((a) => a.id)).toEqual(["gym", "clase", "tarea-alta", "tarea-baja"]);
  });

  it("detecta solapamientos e ignora canceladas", () => {
    expect(solapamientos(act("nueva", { inicio: "19:00", fin: "19:30" }), lista).map((a) => a.id)).toEqual(["clase"]);
    expect(solapamientos(act("nueva", { inicio: "10:30", fin: "11:00" }), lista)).toEqual([]);
    expect(solapamientos(act("nueva", { inicio: "09:30" }), lista).map((a) => a.id)).toEqual(["gym"]);
    expect(solapamientos(act("nueva"), lista)).toEqual([]);
  });

  it("lista vencidas sin reprogramarlas", () => {
    const todas = [act("vieja", { fecha: "2026-10-10" }), act("hecha", { fecha: "2026-10-10", estado: "completada" }), act("hoy")];
    expect(vencidas(todas, "2026-10-12").map((a) => a.id)).toEqual(["vieja"]);
  });

  it("propone hoy, o el próximo día libre a esa hora", () => {
    const vieja = act("vieja", { fecha: "2026-10-10", inicio: "18:00", fin: "19:00" });
    expect(propuesta(vieja, lista, "2026-10-12").fecha).toBe("2026-10-13");
    expect(propuesta(vieja, [], "2026-10-12").fecha).toBe("2026-10-12");
    expect(propuesta(act("t", { fecha: "2026-10-01" }), lista, "2026-10-12").fecha).toBe("2026-10-12");
  });

  it("suma tiempo planificado y resume tareas", () => {
    expect(minutosPlanificados(lista)).toBe(210);
    expect(textoDuracion(210)).toBe("3 h 30 min");
    expect(textoDuracion(45)).toBe("45 min");
    const r = resumenDeTareas(
      [...lista, act("vieja", { fecha: "2026-10-11" }), act("lista", { estado: "completada" })],
      "2026-10-11",
      "2026-10-17",
      "2026-10-12",
    );
    expect(r).toMatchObject({ completadas: 1, vencidas: 1, canceladas: 1, pendientes: 4 });
  });

  it("repite semanalmente con tope", () => {
    expect(fechasRepetidas("2026-10-12", "2026-11-02")).toEqual(["2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02"]);
    expect(fechasRepetidas("2026-01-05", "2027-12-31")).toHaveLength(26);
  });
});

describe("avisos", () => {
  it("arma momentos cruzando la medianoche", () => {
    expect(momento("2026-10-12", 18 * 60 - 30)).toBe("2026-10-12T17:30");
    expect(momento("2026-10-12", -15)).toBe("2026-10-11T23:45");
    expect(localEn("America/Argentina/Buenos_Aires", new Date("2026-10-13T01:30:00Z"))).toBe("2026-10-12T22:30");
  });

  const base = {
    actividades: [
      act("clase", { titulo: "Álgebra", inicio: "18:00", fin: "20:00", recordatorio: 15 }),
      act("tarea", { titulo: "Entregar TP", recordatorio: 0 }),
      act("sin-aviso", { inicio: "17:50" }),
      act("hecha", { inicio: "17:50", recordatorio: 0, estado: "completada" }),
    ],
    habitos: [
      hab("creatina", { nombre: "Creatina", suplemento: true, hora: "17:45" }),
      hab("leer", { tipo: "semanal", dias: [], metaSemanal: 1, hora: "17:45" }),
    ],
    pausas: [],
    registros: [] as Registro[],
    ajustes: AJUSTES_INICIALES,
  };

  it("avisa en la ventana justa, una sola vez por clave", () => {
    const avisos = avisosPendientes(base, "2026-10-12T17:40", "2026-10-12T17:50");
    expect(avisos.map((a) => a.clave)).toEqual(["act:clase:2026-10-12T17:45", "hab:creatina:2026-10-12", "hab:leer:2026-10-12"]);
    expect(avisos[1].cuerpo).toBe("¿Ya lo tomaste?");
    expect(avisosPendientes(base, "2026-10-12T17:45", "2026-10-12T17:50")).toEqual([]);
  });

  it("no avisa lo ya hecho ni la meta semanal cumplida", () => {
    const avisos = avisosPendientes({ ...base, registros: [reg("creatina", "2026-10-12"), reg("leer", "2026-10-12")] }, "2026-10-12T17:40", "2026-10-12T17:50");
    expect(avisos.map((a) => a.clave)).toEqual(["act:clase:2026-10-12T17:45"]);
  });

  it("avisa las tareas sin horario y el resumen del día a su hora", () => {
    const avisos = avisosPendientes(base, "2026-10-12T07:55", "2026-10-12T09:00");
    expect(avisos.map((a) => a.clave)).toEqual(["dia:2026-10-12", "act:tarea:2026-10-12T09:00"]);
    expect(avisos[0].cuerpo).toContain("Hoy: 3 actividades");
  });

  it("manda el resumen semanal el domingo a las 21", () => {
    const avisos = avisosPendientes(base, "2026-10-18T20:55", "2026-10-18T21:05");
    expect(avisos.map((a) => a.clave)).toEqual(["semana:2026-10-12"]);
  });

  it("respeta los interruptores de cada tipo de aviso", () => {
    const con = (cambios: Partial<typeof AJUSTES_INICIALES>) => ({ ...base, ajustes: { ...AJUSTES_INICIALES, ...cambios } });
    const claves = (c: Partial<typeof AJUSTES_INICIALES>) => avisosPendientes(con(c), "2026-10-12T17:40", "2026-10-12T17:50").map((a) => a.clave);
    expect(claves({ avisosActividades: false })).toEqual(["hab:creatina:2026-10-12", "hab:leer:2026-10-12"]);
    expect(claves({ avisosSuplementos: false })).toEqual(["act:clase:2026-10-12T17:45", "hab:leer:2026-10-12"]);
    expect(claves({ avisosHabitos: false })).toEqual(["act:clase:2026-10-12T17:45", "hab:creatina:2026-10-12"]);
    expect(avisosPendientes(con({ horaSemanal: "10:00" }), "2026-10-18T09:55", "2026-10-18T10:05").map((a) => a.clave)).toEqual(["semana:2026-10-12"]);
  });

  it("no avisa en el horario de silencio, aunque cruce la medianoche", () => {
    expect(enSilencio("2026-10-12T23:30", "23:00", "07:00")).toBe(true);
    expect(enSilencio("2026-10-12T06:59", "23:00", "07:00")).toBe(true);
    expect(enSilencio("2026-10-12T07:00", "23:00", "07:00")).toBe(false);
    expect(enSilencio("2026-10-12T14:00", "13:00", "15:00")).toBe(true);
    expect(enSilencio("2026-10-12T14:00", null, null)).toBe(false);
    const callado = { ...base, ajustes: { ...AJUSTES_INICIALES, silencioDesde: "17:00", silencioHasta: "18:00" } };
    expect(avisosPendientes(callado, "2026-10-12T17:40", "2026-10-12T17:50")).toEqual([]);
  });
});
