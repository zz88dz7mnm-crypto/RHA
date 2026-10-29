"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/datos/cliente";
import { datosDeMuestra, repositorioEnMemoria } from "@/lib/datos/memoria";
import type { Repositorio } from "@/lib/datos/repositorio";
import { repositorioSupabase } from "@/lib/datos/supabase";
import { hoyEn } from "@/lib/fechas";
import { USUARIO } from "@/lib/usuario";
import { ProveedorRha, useRha } from "@/lib/rha";
import { Logo } from "./iconos";
import { FondoPersonal } from "./FondoPersonal";
import { Marco } from "./Marco";
import { Boton } from "./ui";

type Estado = { paso: "cargando" } | { paso: "lista"; clave: string; repo: Repositorio };

/** Solo en desarrollo: /demo deja esta marca y la app usa datos de muestra en memoria. */
export const MARCA_DEMO = "rha-demo";

function modoDemo(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    return sessionStorage.getItem(MARCA_DEMO) !== null;
  } catch {
    return false;
  }
}

export function Espera() {
  return (
    <main className="grid min-h-dvh place-items-center" aria-busy="true" aria-label="Cargando">
      <Logo className="size-14 animate-pulse" />
    </main>
  );
}

/** Abre la app directo, sin usuario ni contraseña. Vive en el layout: no se rearma al navegar. */
export function Aplicacion({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  const [estado, setEstado] = useState<Estado>({ paso: "cargando" });

  useEffect(() => {
    // Lo de la demo solo se sabe en el navegador: se decide recién después de hidratar.
    const repo = modoDemo() ? repositorioEnMemoria(datosDeMuestra(hoyEn())) : repositorioSupabase(supabase(), USUARIO);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstado({ paso: "lista", clave: modoDemo() ? "demo" : USUARIO, repo });
  }, []);

  if (ruta === "/demo") return children;
  if (estado.paso === "cargando") return <Espera />;
  return (
    <ProveedorRha key={estado.clave} repo={estado.repo}>
      <ConDatos>{children}</ConDatos>
    </ProveedorRha>
  );
}

function ConDatos({ children }: { children: React.ReactNode }) {
  const { carga, acciones } = useRha();
  if (carga.estado === "cargando") return <Espera />;
  if (carga.estado === "error") {
    return (
      <main className="grid min-h-dvh place-items-center px-5">
        <div className="cristal grid max-w-sm gap-4 rounded-[22px] p-6 text-center">
          <p className="text-[17px] font-semibold">No se pudo cargar</p>
          <p role="alert" className="text-[15px] text-tinta-suave">
            {carga.mensaje}
          </p>
          <Boton onClick={acciones.recargar}>Reintentar</Boton>
        </div>
      </main>
    );
  }
  return (
    <>
      <FondoPersonal url={carga.ajustes.fondo} />
      <Marco>{children}</Marco>
    </>
  );
}
