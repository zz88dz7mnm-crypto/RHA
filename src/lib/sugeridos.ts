import type { Habito } from "./tipos";

/**
 * Los hábitos que eligió el usuario (octubre 2026). No se cargan solos: se activan desde
 * "Mis hábitos", y después se pueden cambiar días, horas y recordatorios.
 */
export type Sugerido = Pick<Habito, "nombre" | "tipo" | "dias" | "metaSemanal" | "suplemento" | "hora" | "medicion"> & {
  categoria: string;
  grupo: "Todos los días" | "Por semana";
  /** Aclaración que se muestra al elegir. */
  detalle?: string;
};

const TODOS = [1, 2, 3, 4, 5, 6, 7];
const diario = { tipo: "dias" as const, dias: TODOS, metaSemanal: null, suplemento: false, hora: null, medicion: null, grupo: "Todos los días" as const };
const semanal = (metaSemanal: number) => ({
  tipo: "semanal" as const,
  dias: [],
  metaSemanal,
  suplemento: false,
  hora: null,
  medicion: null,
  grupo: "Por semana" as const,
});

export const SUGERIDOS: Sugerido[] = [
  { ...diario, nombre: "Acostarme antes de las 00:30", hora: "23:45", categoria: "Salud", detalle: "Sueño: marcás si llegaste a la hora." },
  { ...diario, nombre: "Meditar", categoria: "Salud" },
  { ...diario, nombre: "Controlar el uso del celular", categoria: "Salud", detalle: "Marcás si lo cumpliste, sin números." },
  { ...diario, nombre: "Planificar el día", categoria: "Personal" },
  { ...diario, nombre: "Creatina", suplemento: true, hora: "10:00", categoria: "Salud" },
  { ...diario, nombre: "Proteína", suplemento: true, categoria: "Salud" },
  { ...semanal(3), nombre: "Gimnasio", categoria: "Gimnasio" },
  { ...semanal(5), nombre: "Estudiar", categoria: "Facultad", detalle: "5 días cumple la meta; si llegás a 6 o 7, mejor." },
  { ...semanal(1), nombre: "Investigar cosas nuevas", categoria: "Personal", detalle: "Cuando se pueda: 1 vez por semana como referencia." },
  { ...semanal(1), nombre: "Pesarme", medicion: "peso", categoria: "Salud", detalle: "Al marcarlo anotás los kilos." },
];

export const CATEGORIAS_INICIALES = [
  { nombre: "Facultad", color: "#5e5ce6" },
  { nombre: "Trabajo", color: "#0a84ff" },
  { nombre: "Gimnasio", color: "#ff6b00" },
  { nombre: "Personal", color: "#30b0c7" },
  { nombre: "Salud", color: "#ff2d55" },
];
