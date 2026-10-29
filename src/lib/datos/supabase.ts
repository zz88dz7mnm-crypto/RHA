import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { AJUSTES_INICIALES, type Actividad, type Categoria, type Habito, type Registro } from "../tipos";
import { ajustesDeFila, filaDeAjustes } from "./ajustes";
import { ErrorDeDatos, type Repositorio } from "./repositorio";

const FILAS_POR_PAGINA = 1000;
/** Postgres devuelve las horas como "18:00:00": la app usa "18:00". */
const hora = (h: string | null) => (h ? h.slice(0, 5) : null);

function fallar(error: PostgrestError | null): void {
  if (error) throw new ErrorDeDatos(error.message, error.code);
}

type FilaActividad = {
  id: string;
  titulo: string;
  fecha: string;
  inicio: string | null;
  fin: string | null;
  categoria_id: string | null;
  prioridad: Actividad["prioridad"];
  estado: Actividad["estado"];
  notas: string;
  recordatorio: number | null;
  serie_id: string | null;
};

type FilaHabito = {
  id: string;
  nombre: string;
  tipo: Habito["tipo"];
  dias: number[];
  meta_semanal: number | null;
  categoria_id: string | null;
  suplemento: boolean;
  hora: string | null;
  medicion: Habito["medicion"] | null;
  estado: Habito["estado"];
  desde: string;
  orden: number;
};

/** Donde se guardan las imágenes de fondo (público: la app no tiene login). */
const BUCKET_FONDOS = "fondos";

export function repositorioSupabase(db: SupabaseClient, usuarioId: string): Repositorio {
  async function todas<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>): Promise<T[]> {
    const filas: T[] = [];
    for (let pagina = 0; ; pagina++) {
      const { data, error } = await consulta(pagina * FILAS_POR_PAGINA, (pagina + 1) * FILAS_POR_PAGINA - 1);
      fallar(error);
      filas.push(...(data ?? []));
      if ((data?.length ?? 0) < FILAS_POR_PAGINA) return filas;
    }
  }

  return {
    async ajustes() {
      const { data, error } = await db
        .from("rha_ajustes")
        // Con "*": si todavía no se corrió el SQL nuevo, la app sigue andando con los valores iniciales.
        .select("*")
        .eq("usuario_id", usuarioId)
        .maybeSingle();
      fallar(error);
      if (!data) {
        const { error: alta } = await db.from("rha_ajustes").upsert({ usuario_id: usuarioId }, { onConflict: "usuario_id", ignoreDuplicates: true });
        fallar(alta);
        return AJUSTES_INICIALES;
      }
      return ajustesDeFila(data);
    },

    async guardarAjustes(c) {
      const { error } = await db.from("rha_ajustes").upsert({ usuario_id: usuarioId, ...filaDeAjustes(c) }, { onConflict: "usuario_id" });
      fallar(error);
    },

    async subirFondo(imagen) {
      // Un nombre nuevo cada vez: así ningún dispositivo se queda con la imagen vieja en caché.
      const ruta = `fondo-${Date.now()}.jpg`;
      const { error } = await db.storage.from(BUCKET_FONDOS).upload(ruta, imagen, { contentType: imagen.type || "image/jpeg", upsert: true });
      if (error) throw new ErrorDeDatos(error.message, "storage");
      return db.storage.from(BUCKET_FONDOS).getPublicUrl(ruta).data.publicUrl;
    },

    async borrarFondo(url) {
      const ruta = url.split(`/${BUCKET_FONDOS}/`)[1]?.split("?")[0];
      if (ruta) await db.storage.from(BUCKET_FONDOS).remove([ruta]);
    },

    async categorias() {
      return todas<Categoria>((a, b) =>
        db.from("rha_categorias").select("id, nombre, color, orden").eq("usuario_id", usuarioId).order("orden").order("id").range(a, b),
      );
    },

    async guardarCategoria(c) {
      const { error } = await db
        .from("rha_categorias")
        .upsert({ id: c.id, usuario_id: usuarioId, nombre: c.nombre, color: c.color, orden: c.orden }, { onConflict: "id" });
      fallar(error);
    },

    async borrarCategoria(id) {
      const { error } = await db.from("rha_categorias").delete().eq("id", id).eq("usuario_id", usuarioId);
      fallar(error);
    },

    async actividades() {
      const filas = await todas<FilaActividad>((a, b) =>
        db
          .from("rha_actividades")
          .select("id, titulo, fecha, inicio, fin, categoria_id, prioridad, estado, notas, recordatorio, serie_id")
          .eq("usuario_id", usuarioId)
          .order("fecha")
          .order("id")
          .range(a, b),
      );
      return filas.map((f) => ({
        id: f.id,
        titulo: f.titulo,
        fecha: f.fecha,
        inicio: hora(f.inicio),
        fin: hora(f.fin),
        categoriaId: f.categoria_id,
        prioridad: f.prioridad,
        estado: f.estado,
        notas: f.notas,
        recordatorio: f.recordatorio,
        serieId: f.serie_id,
      }));
    },

    async guardarActividades(lista) {
      if (!lista.length) return;
      const { error } = await db.from("rha_actividades").upsert(
        lista.map((a) => ({
          id: a.id,
          usuario_id: usuarioId,
          titulo: a.titulo,
          fecha: a.fecha,
          inicio: a.inicio,
          fin: a.fin,
          categoria_id: a.categoriaId,
          prioridad: a.prioridad,
          estado: a.estado,
          notas: a.notas,
          recordatorio: a.recordatorio,
          serie_id: a.serieId,
        })),
        { onConflict: "id" },
      );
      fallar(error);
    },

    async borrarActividades(ids) {
      if (!ids.length) return;
      const { error } = await db.from("rha_actividades").delete().in("id", ids).eq("usuario_id", usuarioId);
      fallar(error);
    },

    async habitos() {
      const filas = await todas<FilaHabito>((a, b) =>
        db
          .from("rha_habitos")
          .select("id, nombre, tipo, dias, meta_semanal, categoria_id, suplemento, hora, medicion, estado, desde, orden")
          .eq("usuario_id", usuarioId)
          .order("orden")
          .order("id")
          .range(a, b),
      );
      return filas.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        tipo: f.tipo,
        dias: f.dias,
        metaSemanal: f.meta_semanal,
        categoriaId: f.categoria_id,
        suplemento: f.suplemento,
        hora: hora(f.hora),
        medicion: f.medicion ?? null,
        estado: f.estado,
        desde: f.desde,
        orden: f.orden,
      }));
    },

    async guardarHabitos(lista) {
      if (!lista.length) return;
      const { error } = await db.from("rha_habitos").upsert(
        lista.map((h) => ({
          id: h.id,
          usuario_id: usuarioId,
          nombre: h.nombre,
          tipo: h.tipo,
          dias: h.tipo === "dias" ? h.dias : [],
          meta_semanal: h.tipo === "semanal" ? h.metaSemanal : null,
          categoria_id: h.categoriaId,
          suplemento: h.suplemento,
          hora: h.hora,
          medicion: h.medicion,
          estado: h.estado,
          desde: h.desde,
          orden: h.orden,
        })),
        { onConflict: "id" },
      );
      fallar(error);
    },

    async borrarHabito(id) {
      const { error } = await db.from("rha_habitos").delete().eq("id", id).eq("usuario_id", usuarioId);
      fallar(error);
    },

    async pausas() {
      const filas = await todas<{ id: string; habito_id: string; desde: string; hasta: string | null }>((a, b) =>
        db.from("rha_pausas").select("id, habito_id, desde, hasta").eq("usuario_id", usuarioId).order("id").range(a, b),
      );
      return filas.map((f) => ({ id: f.id, habitoId: f.habito_id, desde: f.desde, hasta: f.hasta }));
    },

    async guardarPausa(p) {
      const { error } = await db
        .from("rha_pausas")
        .upsert({ id: p.id, usuario_id: usuarioId, habito_id: p.habitoId, desde: p.desde, hasta: p.hasta }, { onConflict: "id" });
      fallar(error);
    },

    async registros() {
      const filas = await todas<{ habito_id: string; fecha: string; estado: Registro["estado"]; nota: string; valor: number | string | null }>((a, b) =>
        db.from("rha_registros").select("habito_id, fecha, estado, nota, valor").eq("usuario_id", usuarioId).order("fecha").order("habito_id").range(a, b),
      );
      // Postgres devuelve los numeric como texto.
      return filas.map((f) => ({ habitoId: f.habito_id, fecha: f.fecha, estado: f.estado, nota: f.nota, valor: f.valor === null ? null : Number(f.valor) }));
    },

    async guardarRegistro(r) {
      const { error } = await db
        .from("rha_registros")
        .upsert(
          { usuario_id: usuarioId, habito_id: r.habitoId, fecha: r.fecha, estado: r.estado, nota: r.nota, valor: r.valor },
          { onConflict: "habito_id,fecha" },
        );
      fallar(error);
    },

    async borrarRegistro(habitoId, fecha) {
      const { error } = await db.from("rha_registros").delete().eq("habito_id", habitoId).eq("fecha", fecha).eq("usuario_id", usuarioId);
      fallar(error);
    },

    async guardarSuscripcion(s) {
      // Si el mismo navegador ya estaba registrado (aun con otra cuenta), se reemplaza.
      await db.from("rha_suscripciones").delete().eq("endpoint", s.endpoint);
      const { error } = await db
        .from("rha_suscripciones")
        .insert({ usuario_id: usuarioId, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth, dispositivo: s.dispositivo });
      fallar(error);
    },

    async borrarSuscripcion(endpoint) {
      const { error } = await db.from("rha_suscripciones").delete().eq("endpoint", endpoint).eq("usuario_id", usuarioId);
      fallar(error);
    },
  };
}
