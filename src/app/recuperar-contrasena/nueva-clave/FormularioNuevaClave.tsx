"use client";

import { useActionState } from "react";
import { actualizarContrasena, type EstadoNuevaClave } from "./actions";

const ESTADO_INICIAL: EstadoNuevaClave = { error: null };

export function FormularioNuevaClave() {
  const [estado, formAction, enviando] = useActionState(actualizarContrasena, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-texto">
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="campo-texto"
        />
        <p className="text-xs text-texto-secundario">Mínimo 8 caracteres.</p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmacion" className="text-sm font-medium text-texto">
          Confirmar contraseña
        </label>
        <input
          id="confirmacion"
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="campo-texto"
        />
      </div>

      {estado.error && (
        <p role="alert" className="alerta-error">
          {estado.error}
        </p>
      )}

      <button type="submit" disabled={enviando} aria-busy={enviando} className="btn-primario w-full">
        {enviando ? "Guardando..." : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}
