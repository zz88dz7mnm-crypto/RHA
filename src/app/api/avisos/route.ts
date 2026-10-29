import { timingSafeEqual } from "node:crypto";
import { avisosPendientes, localEn } from "@/lib/avisos";
import { clienteAdmin, configurarPush, datosDeUsuario, mandar, suscripciones } from "@/lib/servidor/envio";
import { USUARIO } from "@/lib/usuario";

/** Cuánto hacia atrás mira cada pasada: si el reloj de la base se atrasa unos minutos, el aviso igual sale (una sola vez). */
const VENTANA_MS = 10 * 60_000;

function autorizado(request: Request): boolean {
  const secreto = process.env.AVISOS_SECRETO;
  const recibido = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secreto || recibido.length !== secreto.length) return false;
  return timingSafeEqual(Buffer.from(recibido), Buffer.from(secreto));
}

/**
 * La llama la base de datos cada minuto (pg_cron, ver supabase/avisos.sql).
 * Calcula qué avisos tocan en los últimos minutos y manda cada uno una sola vez:
 * antes de mandar, anota su clave; si ya estaba anotada, no lo repite.
 */
export async function POST(request: Request) {
  if (!autorizado(request)) return Response.json({ error: "no autorizado" }, { status: 401 });
  let db: ReturnType<typeof clienteAdmin>;
  let todas: Awaited<ReturnType<typeof suscripciones>>;
  try {
    configurarPush(new URL(request.url).origin);
    db = clienteAdmin();
    todas = await suscripciones(db);
    // Para que Ajustes pueda mostrar que el disparador de Supabase está andando.
    await db.from("rha_ajustes").upsert({ usuario_id: USUARIO, avisos_ultima_pasada: new Date().toISOString() }, { onConflict: "usuario_id" });
  } catch (fallo) {
    // Falta configurar algo en Vercel (claves) o la base no tiene las tablas: se dice qué.
    return Response.json({ error: (fallo as Error).message }, { status: 500 });
  }
  const porUsuario = new Map<string, typeof todas>();
  for (const s of todas) porUsuario.set(s.usuario_id, [...(porUsuario.get(s.usuario_id) ?? []), s]);
  const ahora = new Date();
  let enviados = 0;
  let avisos = 0;

  for (const [usuarioId, subs] of porUsuario) {
    try {
      // El rango de datos se pide con la fecha de Argentina; los avisos se calculan en la zona del usuario.
      const datos = await datosDeUsuario(db, usuarioId, localEn("America/Argentina/Buenos_Aires", ahora).slice(0, 10));
      const desde = localEn(datos.zona, new Date(ahora.getTime() - VENTANA_MS));
      const lista = avisosPendientes(datos, desde, localEn(datos.zona, ahora));
      for (const aviso of lista) {
        const { data, error } = await db
          .from("rha_avisos_enviados")
          .upsert({ usuario_id: usuarioId, clave: aviso.clave }, { onConflict: "usuario_id,clave", ignoreDuplicates: true })
          .select("clave");
        if (error) throw error;
        if (!data?.length) continue; // ya se había mandado
        avisos += 1;
        enviados += await mandar(db, subs, aviso);
      }
    } catch (fallo) {
      console.error("avisos de", usuarioId, fallo);
    }
  }

  // Limpieza: las claves de más de 40 días ya no pueden repetirse.
  if (ahora.getUTCMinutes() === 0) {
    await db
      .from("rha_avisos_enviados")
      .delete()
      .lt("enviado_en", new Date(ahora.getTime() - 40 * 86_400_000).toISOString());
  }

  return Response.json({ usuarios: porUsuario.size, avisos, enviados });
}
