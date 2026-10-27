"use client";

import { useActionState } from "react";
import { crearUsuario, type EstadoFormularioUsuario } from "./actions";

const ESTADO_INICIAL: EstadoFormularioUsuario = { error: null };

export function FormularioNuevoUsuario() {
  const [estado, formAction, enviando] = useActionState(crearUsuario, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="nombre" className="text-xs font-medium text-slate-600">
          Nombre
        </label>
        <input id="nombre" name="nombre" required className="campo-texto" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="apellido" className="text-xs font-medium text-slate-600">
          Apellido
        </label>
        <input id="apellido" name="apellido" required className="campo-texto" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-xs font-medium text-slate-600">
          Correo
        </label>
        <input id="email" name="email" type="email" required className="campo-texto" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="rol" className="text-xs font-medium text-slate-600">
          Rol
        </label>
        <select id="rol" name="rol" defaultValue="estudiante" className="campo-select">
          <option value="estudiante">Estudiante</option>
          <option value="docente">Docente</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-lila-600 px-4 py-2 text-sm font-semibold text-white hover:bg-lila-800 disabled:opacity-60"
      >
        {enviando ? "Creando..." : "Crear usuario"}
      </button>
      {estado.error && <p className="w-full text-sm text-error">{estado.error}</p>}
      {estado.mensaje && <p className="w-full text-sm text-exito">{estado.mensaje}</p>}
    </form>
  );
}
