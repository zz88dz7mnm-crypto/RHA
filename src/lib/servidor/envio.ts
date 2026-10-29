import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { sumarDias } from "../fechas";
import type { Aviso } from "../avisos";
import { ajustesDeFila } from "../datos/ajustes";
import { AJUSTES_INICIALES, type Actividad, type Ajustes, type Habito, type Pausa, type Registro } from "../tipos";

/**
 * Lo que corre en el servidor para mandar notificaciones. Usa la clave secreta de Supabase,
 * que vive solo en las variables de entorno de Vercel: nunca llega al navegador ni al repo.
 */
export function clienteAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) throw new Error("Falta SUPABASE_SECRET_KEY en las variables de entorno");
  return createClient(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function configurarPush(origen: string) {
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) throw new Error("Faltan las claves VAPID en las variables de entorno");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || origen, publica, privada);
}

type Suscripcion = { id: string; usuario_id: string; endpoint: string; p256dh: string; auth: string };

export async function suscripciones(db: SupabaseClient, usuarioId?: string): Promise<Suscripcion[]> {
  let q = db.from("rha_suscripciones").select("id, usuario_id, endpoint, p256dh, auth");
  if (usuarioId) q = q.eq("usuario_id", usuarioId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Manda un aviso a todos los dispositivos. Los que ya no existen (404/410) se borran. */
export async function mandar(db: SupabaseClient, subs: Suscripcion[], aviso: Pick<Aviso, "titulo" | "cuerpo" | "url"> & { clave?: string }) {
  let enviados = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ titulo: aviso.titulo, cuerpo: aviso.cuerpo, url: aviso.url, etiqueta: aviso.clave }),
        { TTL: 60 * 30, urgency: "high" },
      );
      enviados += 1;
    } catch (fallo) {
      const estado = (fallo as { statusCode?: number }).statusCode;
      if (estado === 404 || estado === 410) await db.from("rha_suscripciones").delete().eq("id", s.id);
      else console.error("push falló", estado, (fallo as Error).message);
    }
  }
  return enviados;
}

const hora = (h: string | null) => (h ? h.slice(0, 5) : null);

/** Lo que hace falta de un usuario para calcular sus avisos: unos días alrededor de hoy. */
export async function datosDeUsuario(db: SupabaseClient, usuarioId: string, hoy: string) {
  const desde = sumarDias(hoy, -8);
  const hasta = sumarDias(hoy, 2);
  const [aj, act, hab, pau, reg] = await Promise.all([
    db.from("rha_ajustes").select("*").eq("usuario_id", usuarioId).maybeSingle(),
    db
      .from("rha_actividades")
      .select("id, titulo, fecha, inicio, fin, categoria_id, prioridad, estado, notas, recordatorio, serie_id")
      .eq("usuario_id", usuarioId)
      .gte("fecha", desde)
      .lte("fecha", hasta),
    db.from("rha_habitos").select("id, nombre, tipo, dias, meta_semanal, categoria_id, suplemento, hora, estado, desde, orden").eq("usuario_id", usuarioId),
    db.from("rha_pausas").select("id, habito_id, desde, hasta").eq("usuario_id", usuarioId),
    db.from("rha_registros").select("habito_id, fecha, estado, nota").eq("usuario_id", usuarioId).gte("fecha", desde).lte("fecha", hasta),
  ]);
  for (const r of [aj, act, hab, pau, reg]) if (r.error) throw r.error;
  const a = aj.data;
  const ajustes: Ajustes = a ? ajustesDeFila(a) : AJUSTES_INICIALES;
  return {
    zona: (a?.zona_horaria as string | undefined) ?? "America/Argentina/Buenos_Aires",
    ajustes,
    actividades: (act.data ?? []).map(
      (f): Actividad => ({
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
      }),
    ),
    habitos: (hab.data ?? []).map(
      (f): Habito => ({
        id: f.id,
        nombre: f.nombre,
        tipo: f.tipo,
        dias: f.dias,
        metaSemanal: f.meta_semanal,
        categoriaId: f.categoria_id,
        suplemento: f.suplemento,
        hora: hora(f.hora),
        medicion: null,
        estado: f.estado,
        desde: f.desde,
        orden: f.orden,
      }),
    ),
    pausas: (pau.data ?? []).map((f): Pausa => ({ id: f.id, habitoId: f.habito_id, desde: f.desde, hasta: f.hasta })),
    registros: (reg.data ?? []).map((f): Registro => ({ habitoId: f.habito_id, fecha: f.fecha, estado: f.estado, nota: f.nota, valor: null })),
  };
}
