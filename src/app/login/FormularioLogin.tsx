"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "./actions";

const ESTADO_INICIAL: EstadoLogin = { error: null };

export function FormularioLogin({ redirectTo }: { redirectTo: string }) {
  const [estado, formAction, enviando] = useActionState(iniciarSesion, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-texto">
          Usuario (correo electrónico)
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="campo-texto"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-texto">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="campo-texto"
        />
      </div>

      {estado.error && (
        <p role="alert" className="alerta-error">
          {estado.error}
        </p>
      )}

      <button type="submit" disabled={enviando} aria-busy={enviando} className="btn-primario mt-2 w-full">
        {enviando ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
