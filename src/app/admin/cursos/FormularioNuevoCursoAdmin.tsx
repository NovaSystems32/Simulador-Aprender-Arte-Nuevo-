"use client";

import { useActionState } from "react";
import { crearCursoAdmin, type EstadoFormulario } from "./actions";

const ESTADO_INICIAL: EstadoFormulario = { error: null };

export function FormularioNuevoCursoAdmin({ docentes }: { docentes: { id: string; nombre: string; apellido: string }[] }) {
  const [estado, formAction, enviando] = useActionState(crearCursoAdmin, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="nombre" className="text-xs font-medium text-slate-600">
          Nombre
        </label>
        <input id="nombre" name="nombre" placeholder="6to Año" required className="campo-texto" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="division" className="text-xs font-medium text-slate-600">
          División
        </label>
        <input id="division" name="division" placeholder="A" required className="campo-texto" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="anio_lectivo" className="text-xs font-medium text-slate-600">
          Ciclo lectivo
        </label>
        <input id="anio_lectivo" name="anio_lectivo" type="number" defaultValue={new Date().getFullYear()} className="campo-texto" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="docente_titular_id" className="text-xs font-medium text-slate-600">
          Docente titular
        </label>
        <select id="docente_titular_id" name="docente_titular_id" className="campo-select">
          <option value="">Sin asignar</option>
          {docentes.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nombre} {d.apellido}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-lila-600 px-4 py-2 text-sm font-semibold text-white hover:bg-lila-800 disabled:opacity-60"
      >
        {enviando ? "Creando..." : "Crear curso"}
      </button>
      {estado.error && <p className="w-full text-sm text-error">{estado.error}</p>}
    </form>
  );
}
