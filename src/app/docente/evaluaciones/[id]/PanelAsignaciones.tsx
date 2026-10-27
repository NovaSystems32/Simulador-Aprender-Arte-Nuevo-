"use client";

import { useState, useTransition } from "react";
import { asignarCurso, quitarAsignacion } from "../actions";

export function PanelAsignaciones({
  evaluacionId,
  cursos,
  asignados,
}: {
  evaluacionId: string;
  cursos: { id: string; nombre: string; division: string }[];
  asignados: { curso_id: string; cursos: { nombre: string; division: string } | null }[];
}) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");

  const idsAsignados = new Set(asignados.map((a) => a.curso_id));
  const cursosDisponibles = cursos.filter((c) => !idsAsignados.has(c.id));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-semibold text-lila-800">Cursos asignados</h2>

      {asignados.length === 0 ? (
        <p className="text-sm text-slate-500">Esta evaluación todavía no está asignada a ningún curso.</p>
      ) : (
        <ul className="mb-4 flex flex-col gap-2">
          {asignados.map((a) => (
            <li key={a.curso_id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span>
                {a.cursos?.nombre} &quot;{a.cursos?.division}&quot;
              </span>
              <button
                type="button"
                disabled={pendiente}
                onClick={() => iniciarTransicion(() => quitarAsignacion(evaluacionId, a.curso_id))}
                className="text-xs font-medium text-error hover:underline disabled:opacity-50"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {cursosDisponibles.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="curso-a-asignar" className="text-xs font-medium text-slate-600">
              Asignar a otro curso
            </label>
            <select
              id="curso-a-asignar"
              value={cursoSeleccionado}
              onChange={(e) => setCursoSeleccionado(e.target.value)}
              className="campo-select"
            >
              <option value="">Seleccioná un curso</option>
              {cursosDisponibles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} &quot;{c.division}&quot;
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!cursoSeleccionado || pendiente}
            onClick={() => {
              iniciarTransicion(() => asignarCurso(evaluacionId, cursoSeleccionado));
              setCursoSeleccionado("");
            }}
            className="rounded-lg bg-lila-600 px-4 py-2 text-sm font-medium text-white hover:bg-lila-800 disabled:opacity-50"
          >
            Asignar
          </button>
        </div>
      )}
    </div>
  );
}
