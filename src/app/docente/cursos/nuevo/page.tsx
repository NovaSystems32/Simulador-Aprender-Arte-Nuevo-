"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { crearCurso, type EstadoFormulario } from "../actions";

const ESTADO_INICIAL: EstadoFormulario = { error: null };

export default function PaginaNuevoCurso() {
  const router = useRouter();
  const [estado, formAction, enviando] = useActionState(crearCurso, ESTADO_INICIAL);

  useEffect(() => {
    if (estado.mensaje) router.push("/docente/cursos");
  }, [estado.mensaje, router]);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold text-lila-800">Nuevo curso</h1>
      <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-1">
          <label htmlFor="nombre" className="text-sm font-medium text-slate-700">
            Nombre (ej: 6to Año)
          </label>
          <input id="nombre" name="nombre" required className="campo-texto" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="division" className="text-sm font-medium text-slate-700">
            División (ej: A)
          </label>
          <input id="division" name="division" required className="campo-texto" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="anio_lectivo" className="text-sm font-medium text-slate-700">
            Ciclo lectivo
          </label>
          <input id="anio_lectivo" name="anio_lectivo" type="number" defaultValue={new Date().getFullYear()} required className="campo-texto" />
        </div>
        {estado.error && <p className="rounded-md bg-error-50 px-3 py-2 text-sm text-error">{estado.error}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="rounded-lg bg-lila-600 px-4 py-2.5 font-semibold text-white hover:bg-lila-800 disabled:opacity-60"
        >
          {enviando ? "Creando..." : "Crear curso"}
        </button>
      </form>
    </div>
  );
}
