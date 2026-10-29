import { connection } from "next/server";
import { clienteAdmin, suscripciones } from "@/lib/servidor/envio";
import { USUARIO } from "@/lib/usuario";

export type EstadoAvisos = {
  /** Qué variables de entorno hay en Vercel (solo si están, nunca su valor). */
  claves: { vapidPublica: boolean; vapidPrivada: boolean; secreto: boolean; servidor: boolean };
  /** La última vez que Supabase llamó a /api/avisos (pg_cron), o null si nunca. */
  ultimaPasada: string | null;
  /** Dispositivos con notificaciones activadas, o null si no se pudo leer. */
  dispositivos: number | null;
};

/** Para Ajustes → Notificaciones: dice qué falta configurar para que lleguen los avisos. */
export async function GET() {
  await connection(); // se lee en cada pedido, nunca en el build
  const estado: EstadoAvisos = {
    claves: {
      vapidPublica: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      vapidPrivada: !!process.env.VAPID_PRIVATE_KEY,
      secreto: !!process.env.AVISOS_SECRETO,
      servidor: !!process.env.SUPABASE_SECRET_KEY,
    },
    ultimaPasada: null,
    dispositivos: null,
  };
  if (estado.claves.servidor) {
    try {
      const db = clienteAdmin();
      estado.dispositivos = (await suscripciones(db, USUARIO)).length;
      const { data } = await db.from("rha_ajustes").select("*").eq("usuario_id", USUARIO).maybeSingle();
      estado.ultimaPasada = (data?.avisos_ultima_pasada as string | undefined) ?? null;
    } catch {
      // La clave está pero no anda (o falta el SQL): se ve como "sin dispositivos" y "nunca".
    }
  }
  return Response.json(estado, { headers: { "Cache-Control": "no-store" } });
}
