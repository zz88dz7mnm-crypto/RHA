/** Fechas como texto AAAA-MM-DD (día local de Argentina) y horas como "HH:MM". */

export type Categoria = { id: string; nombre: string; color: string; orden: number };

export type Prioridad = "alta" | "media" | "baja";
export type EstadoActividad = "pendiente" | "completada" | "cancelada";

export type Actividad = {
  id: string;
  titulo: string;
  fecha: string;
  /** Sin hora de inicio es una tarea sin horario. */
  inicio: string | null;
  fin: string | null;
  categoriaId: string | null;
  prioridad: Prioridad;
  estado: EstadoActividad;
  notas: string;
  /** Minutos antes del inicio para avisar. En tareas sin horario, avisa a la hora de tareas de los ajustes. */
  recordatorio: number | null;
  /** Las actividades que se crearon juntas al repetir comparten este id. */
  serieId: string | null;
};

/** "dias": días fijos de la semana. "semanal": una cantidad de veces por semana, cualquier día. */
export type TipoHabito = "dias" | "semanal";
export type EstadoHabito = "activo" | "pausado" | "archivado";

export type Habito = {
  id: string;
  nombre: string;
  tipo: TipoHabito;
  /** Días de la semana: 1 = lunes … 7 = domingo. Solo para "dias". */
  dias: number[];
  /** Veces por semana. Solo para "semanal". */
  metaSemanal: number | null;
  categoriaId: string | null;
  suplemento: boolean;
  /** Hora del recordatorio, si tiene. */
  hora: string | null;
  /** "peso": al marcarlo se anota un valor (kilos). */
  medicion: "peso" | null;
  estado: EstadoHabito;
  /** Desde qué día cuenta. */
  desde: string;
  orden: number;
};

/** Mientras dura una pausa no se cuentan incumplimientos. `hasta` es el día en que se retomó (no incluido). */
export type Pausa = { id: string; habitoId: string; desde: string; hasta: string | null };

export type EstadoRegistro = "completado" | "parcial" | "no_completado";
export type Registro = {
  habitoId: string;
  fecha: string;
  estado: EstadoRegistro;
  nota: string;
  /** El valor medido (kilos, para el peso). */ valor: number | null;
};

export type Ajustes = {
  /** A qué hora avisar de las tareas sin horario del día. */
  horaTareas: string;
  resumenDiario: boolean;
  horaResumen: string;
  /** Domingo a las 21:00. */
  resumenSemanal: boolean;
  /** Imagen de fondo elegida por el usuario (dirección pública en Supabase Storage). Sin imagen, el fondo ambiental. */
  fondo: string | null;
};

export const AJUSTES_INICIALES: Ajustes = { horaTareas: "09:00", resumenDiario: true, horaResumen: "08:00", resumenSemanal: true, fondo: null };
