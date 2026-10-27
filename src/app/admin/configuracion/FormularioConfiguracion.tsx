"use client";

import { useActionState } from "react";
import { guardarConfiguracion, type EstadoConfiguracion } from "./actions";

const ESTADO_INICIAL: EstadoConfiguracion = { error: null };

export function FormularioConfiguracion({
  nombreInstitucion,
  puntajeAprobacionDefault,
}: {
  nombreInstitucion: string;
  puntajeAprobacionDefault: number;
}) {
  const [estado, formAction, enviando] = useActionState(guardarConfiguracion, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-1">
        <label htmlFor="nombre_institucion" className="text-sm font-medium text-slate-700">
          Nombre de la institución
        </label>
        <input
          id="nombre_institucion"
          name="nombre_institucion"
          defaultValue={nombreInstitucion}
          required
          className="campo-texto"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="puntaje_aprobacion_default" className="text-sm font-medium text-slate-700">
          Puntaje de aprobación por defecto (%)
        </label>
        <input
          id="puntaje_aprobacion_default"
          name="puntaje_aprobacion_default"
          type="number"
          min={0}
          max={100}
          defaultValue={puntajeAprobacionDefault}
          className="campo-texto"
        />
        <p className="text-xs text-slate-500">Se usa como valor sugerido al crear nuevas evaluaciones.</p>
      </div>
      {estado.error && <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error">{estado.error}</p>}
      {estado.guardado && <p className="rounded-md bg-exito-50 px-3 py-2 text-sm text-exito">Guardado correctamente.</p>}
      <button
        type="submit"
        disabled={enviando}
        className="self-start rounded-lg bg-lila-600 px-5 py-2.5 font-semibold text-white hover:bg-lila-800 disabled:opacity-60"
      >
        {enviando ? "Guardando..." : "Guardar configuración"}
      </button>
    </form>
  );
}
