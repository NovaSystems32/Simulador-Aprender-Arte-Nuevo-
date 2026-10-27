"use client";

import { useTransition } from "react";
import type { EstadoEvaluacion } from "@/lib/types";
import { cambiarEstadoEvaluacion } from "../actions";

const ETIQUETA: Record<EstadoEvaluacion, string> = {
  borrador: "Borrador",
  publicada: "Publicada",
  archivada: "Archivada",
};

export function BotonesEstado({ evaluacionId, estadoActual }: { evaluacionId: string; estadoActual: EstadoEvaluacion }) {
  const [pendiente, iniciarTransicion] = useTransition();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="rounded-full bg-lila-100 px-3 py-1 text-xs font-medium text-lila-800">
        {ETIQUETA[estadoActual]}
      </span>
      {estadoActual !== "publicada" && (
        <button
          type="button"
          disabled={pendiente}
          onClick={() => iniciarTransicion(() => cambiarEstadoEvaluacion(evaluacionId, "publicada"))}
          className="rounded-lg bg-exito px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          Publicar
        </button>
      )}
      {estadoActual !== "archivada" && (
        <button
          type="button"
          disabled={pendiente}
          onClick={() => iniciarTransicion(() => cambiarEstadoEvaluacion(evaluacionId, "archivada"))}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Archivar
        </button>
      )}
    </div>
  );
}
