import type { Actividad, Ajustes, Categoria, Habito, Pausa, Registro } from "../tipos";

export type Suscripcion = { endpoint: string; p256dh: string; auth: string; dispositivo: string };

/**
 * Todo lo que RHA guarda o lee. Hay una versión real (Supabase) y otra en memoria.
 * Los ids los genera la app: repetir un guardado actualiza en vez de duplicar.
 */
export interface Repositorio {
  ajustes(): Promise<Ajustes>;
  guardarAjustes(cambios: Partial<Ajustes>): Promise<void>;

  categorias(): Promise<Categoria[]>;
  guardarCategoria(c: Categoria): Promise<void>;
  borrarCategoria(id: string): Promise<void>;

  actividades(): Promise<Actividad[]>;
  /** Crea o actualiza varias de una vez (por ejemplo, una repetición semanal). */
  guardarActividades(lista: Actividad[]): Promise<void>;
  borrarActividades(ids: string[]): Promise<void>;

  habitos(): Promise<Habito[]>;
  guardarHabitos(lista: Habito[]): Promise<void>;
  borrarHabito(id: string): Promise<void>;
  pausas(): Promise<Pausa[]>;
  guardarPausa(p: Pausa): Promise<void>;

  registros(): Promise<Registro[]>;
  guardarRegistro(r: Registro): Promise<void>;
  borrarRegistro(habitoId: string, fecha: string): Promise<void>;

  guardarSuscripcion(s: Suscripcion): Promise<void>;
  borrarSuscripcion(endpoint: string): Promise<void>;
}

export class ErrorDeDatos extends Error {
  constructor(
    mensaje: string,
    readonly codigo?: string,
  ) {
    super(mensaje);
  }

  /** La base no tiene una tabla o columna que la app necesita: falta correr el SQL. */
  get baseDesactualizada(): boolean {
    return ["42703", "42P01", "42883", "PGRST202", "PGRST204", "PGRST205"].includes(this.codigo ?? "");
  }
}
