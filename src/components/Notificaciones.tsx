"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/datos/cliente";
import { useDatos } from "@/lib/rha";
import { Boton } from "./ui";

type Estado = "cargando" | "sin_soporte" | "instalar" | "bloqueadas" | "apagadas" | "activas";

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function aBytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalada = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** Registra el service worker apenas carga la app (lo necesitan las notificaciones). */
export function useServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
}

async function leerEstado(): Promise<Estado> {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return esIOS() && !instalada() ? "instalar" : "sin_soporte";
  if (!("PushManager" in window)) return esIOS() && !instalada() ? "instalar" : "sin_soporte";
  if (Notification.permission === "denied") return "bloqueadas";
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) ? "activas" : "apagadas";
}

/**
 * Activar las notificaciones de este dispositivo. En iPhone solo funcionan con la app
 * agregada a la pantalla de inicio (iOS 16.4 o más): si no, se explica cómo.
 */
export function Notificaciones() {
  const { repo } = useDatos();
  const [estado, setEstado] = useState<Estado>("cargando");
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vigente = true;
    leerEstado()
      .then((e) => vigente && setEstado(e))
      .catch(() => vigente && setEstado("sin_soporte"));
    return () => {
      vigente = false;
    };
  }, []);

  async function activar() {
    setOcupado(true);
    setMensaje("");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueadas" : "apagadas");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(CLAVE_PUBLICA) }));
      const json = sub.toJSON();
      await repo.guardarSuscripcion({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        dispositivo: esIOS() ? "iPhone" : navigator.platform || "Navegador",
      });
      setEstado("activas");
      setMensaje("Listo: este dispositivo va a recibir tus recordatorios.");
    } catch {
      setMensaje("No pude activarlas. Revisá la conexión y probá de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  async function desactivar() {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await repo.borrarSuscripcion(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("apagadas");
      setMensaje("");
    } catch {
      setMensaje("No pude desactivarlas. Probá de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  async function probar() {
    setOcupado(true);
    setMensaje("");
    try {
      const { data } = await supabase().auth.getSession();
      const r = await fetch("/api/avisos/prueba", { method: "POST", headers: { authorization: `Bearer ${data.session?.access_token ?? ""}` } });
      const cuerpo = (await r.json().catch(() => ({}))) as { error?: string };
      setMensaje(r.ok ? "Mandé una notificación de prueba. Si no llega en unos segundos, avisame." : (cuerpo.error ?? "No se pudo mandar la prueba."));
    } catch {
      setMensaje("No me pude conectar con el servidor.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="grid gap-3">
      {estado === "cargando" && <p className="text-[14px] text-tinta-suave">Revisando…</p>}
      {estado === "instalar" && (
        <p className="text-[14px] leading-snug">
          En iPhone las notificaciones funcionan solo con la app instalada: en Safari tocá <strong>Compartir</strong> →{" "}
          <strong>Agregar a pantalla de inicio</strong>, abrila desde el ícono y volvé acá.
        </p>
      )}
      {estado === "sin_soporte" && (
        <p className="text-[14px] text-tinta-suave">Este navegador no admite notificaciones. Los recordatorios se ven igual dentro de la app.</p>
      )}
      {estado === "bloqueadas" && (
        <p className="text-[14px] leading-snug">
          Las notificaciones están bloqueadas para RHA. En iPhone: <strong>Ajustes → Notificaciones → RHA</strong> y activalas. Después volvé acá.
        </p>
      )}
      {estado === "apagadas" && (
        <>
          <p className="text-[14px] text-tinta-suave">Te aviso a la hora de tus actividades, hábitos y suplementos, aunque la app esté cerrada.</p>
          <Boton onClick={activar} disabled={ocupado || !CLAVE_PUBLICA}>
            {ocupado ? "Activando…" : "Activar notificaciones"}
          </Boton>
        </>
      )}
      {estado === "activas" && (
        <>
          <p className="text-[14px] font-semibold text-verde">Activadas en este dispositivo.</p>
          <div className="grid grid-cols-2 gap-2">
            <Boton variante="suave" onClick={probar} disabled={ocupado}>
              Probar
            </Boton>
            <Boton variante="secundario" onClick={desactivar} disabled={ocupado}>
              Desactivar
            </Boton>
          </div>
        </>
      )}
      {mensaje && (
        <p role="status" className="text-[14px]">
          {mensaje}
        </p>
      )}
    </div>
  );
}
