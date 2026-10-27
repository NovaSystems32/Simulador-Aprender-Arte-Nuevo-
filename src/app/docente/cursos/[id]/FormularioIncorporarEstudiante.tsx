"use client";

import { useActionState } from "react";
import { incorporarEstudianteNuevo, type EstadoFormulario } from "../actions";

const ESTADO_INICIAL: EstadoFormulario = { error: null };

/** Crea una cuenta de estudiante que todavía no existe y la incorpora directo al curso.
 * Para agregar estudiantes ya registrados, se usa la búsqueda de "Estudiantes del curso" de arriba. */
export function FormularioIncorporarEstudiante({ cursoId }: { cursoId: string }) {
  const accion = incorporarEstudianteNuevo.bind(null, cursoId);
  const [estado, formAction, enviando] = useActionState(accion, ESTADO_INICIAL);

  return (
    <div className="tarjeta">
      <h2 className="mb-1 font-bold text-lila-800">Registrar un estudiante nuevo</h2>
      <p className="mb-3 text-sm text-texto-secundario">
        Usá esto solo si el estudiante todavía no tiene una cuenta. Si ya está registrado, buscalo arriba en
        &quot;Agregar estudiantes registrados&quot;.
      </p>
      <form action={formAction} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input name="nombre" placeholder="Nombre" required className="campo-texto" />
          <input name="apellido" placeholder="Apellido" required className="campo-texto" />
          <input name="email" type="email" placeholder="Correo electrónico" required className="campo-texto" />
        </div>
        {estado.error && <p className="alerta-error">{estado.error}</p>}
        {estado.mensaje && <p className="alerta-exito">{estado.mensaje}</p>}
        <button type="submit" disabled={enviando} className="btn-primario w-fit">
          {enviando ? "Creando..." : "Crear e incorporar"}
        </button>
      </form>
    </div>
  );
}
