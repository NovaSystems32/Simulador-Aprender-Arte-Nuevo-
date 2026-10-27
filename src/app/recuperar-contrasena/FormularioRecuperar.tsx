"use client";

import { useActionState } from "react";
import { solicitarRecuperacion, type EstadoRecuperacion } from "./actions";

const ESTADO_INICIAL: EstadoRecuperacion = { error: null };

export function FormularioRecuperar() {
  const [estado, formAction, enviando] = useActionState(solicitarRecuperacion, ESTADO_INICIAL);

  if (estado.enviado) {
    return (
      <p className="alerta-exito" role="status">
        Si el correo pertenece a una cuenta registrada, te enviamos un enlace para restablecer tu
        contraseña. Revisá tu bandeja de entrada (y la carpeta de spam).
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-texto">
          Correo electrónico
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className="campo-texto" />
      </div>

      {estado.error && (
        <p role="alert" className="alerta-error">
          {estado.error}
        </p>
      )}

      <button type="submit" disabled={enviando} aria-busy={enviando} className="btn-primario w-full">
        {enviando ? "Enviando..." : "Enviar enlace de recuperación"}
      </button>
    </form>
  );
}
