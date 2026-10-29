"use client";

import { useEffect, useRef } from "react";

/**
 * Hoja que sube desde abajo en el celular y se centra en la compu. Es un <dialog> nativo:
 * atrapa el foco y se cierra con Escape o tocando afuera.
 */
export function Hoja({ abierta, titulo, onCerrar, children }: { abierta: boolean; titulo: string; onCerrar: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
  }, [abierta]);

  return (
    <dialog
      ref={ref}
      aria-label={titulo}
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
      className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[30px] bg-fondo p-0 text-tinta backdrop:bg-black/40 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-lg sm:rounded-[22px]"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-fondo/90 px-5 pt-4 pb-3 backdrop-blur">
        <h2 className="text-[20px] font-bold">{titulo}</h2>
        <button type="button" onClick={onCerrar} className="rounded-full bg-tinta/8 px-3 py-1.5 text-[14px] font-semibold text-tinta-suave">
          Cerrar
        </button>
      </div>
      {abierta && <div className="px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">{children}</div>}
    </dialog>
  );
}

export const CAMPO =
  "h-11 w-full min-w-0 rounded-xl border border-linea bg-campo px-3 text-[16px] text-tinta outline-none focus:border-acento focus:ring-2 focus:ring-acento/20";

export function Etiqueta({ texto, children, className }: { texto: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`grid min-w-0 gap-1 text-[13px] font-medium text-tinta-suave ${className ?? ""}`}>
      {texto}
      {children}
    </label>
  );
}
