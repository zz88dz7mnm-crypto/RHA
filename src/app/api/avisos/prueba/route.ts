import { clienteAdmin, configurarPush, mandar, suscripciones } from "@/lib/servidor/envio";

/** Manda una notificación de prueba a los dispositivos del usuario que la pide (con su sesión). */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return Response.json({ error: "falta la sesión" }, { status: 401 });
  try {
    configurarPush(new URL(request.url).origin);
    const db = clienteAdmin();
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user) return Response.json({ error: "sesión inválida" }, { status: 401 });
    const subs = await suscripciones(db, data.user.id);
    if (!subs.length) return Response.json({ error: "no hay dispositivos con notificaciones activadas" }, { status: 404 });
    const enviados = await mandar(db, subs, { titulo: "RHA", cuerpo: "¡Las notificaciones funcionan!", url: "/" });
    return Response.json({ enviados });
  } catch (fallo) {
    console.error(fallo);
    return Response.json({ error: "El servidor no tiene configuradas las notificaciones todavía." }, { status: 500 });
  }
}
