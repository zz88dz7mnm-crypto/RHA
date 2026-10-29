import { clienteAdmin, configurarPush, mandar, suscripciones } from "@/lib/servidor/envio";
import { USUARIO } from "@/lib/usuario";

/** Manda una notificación de prueba a los dispositivos con notificaciones activadas. */
export async function POST(request: Request) {
  try {
    configurarPush(new URL(request.url).origin);
    const db = clienteAdmin();
    const subs = await suscripciones(db, USUARIO);
    if (!subs.length) return Response.json({ error: "no hay dispositivos con notificaciones activadas" }, { status: 404 });
    const enviados = await mandar(db, subs, { titulo: "RHA", cuerpo: "¡Las notificaciones funcionan!", url: "/" });
    return Response.json({ enviados });
  } catch (fallo) {
    console.error(fallo);
    return Response.json({ error: "El servidor no tiene configuradas las notificaciones todavía." }, { status: 500 });
  }
}
