"use client";

import { useState } from "react";
import { ConfirmacionPeligrosa } from "@/components/admin/ConfirmacionPeligrosa";
import {
  eliminarEvaluacion,
  limpiarHistorialEstudiante,
  limpiarHistorialEvaluacion,
  limpiarHistorialGeneral,
  obtenerResumenEliminacionEvaluacion,
  obtenerResumenHistorialEstudiante,
  obtenerResumenHistorialEvaluacion,
  obtenerResumenLimpiezaGeneral,
} from "./actions";

type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

function Aviso({ mensaje }: { mensaje: Mensaje }) {
  if (!mensaje) return null;
  return <p className={`mt-3 ${mensaje.tipo === "ok" ? "alerta-exito" : "alerta-error"}`}>{mensaje.texto}</p>;
}

export function SeccionLimpiarHistorialEstudiante({ estudiantes }: { estudiantes: { id: string; nombre: string; apellido: string; email: string }[] }) {
  const [seleccionado, setSeleccionado] = useState("");
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const estudiante = estudiantes.find((e) => e.id === seleccionado);

  return (
    <div className="tarjeta">
      <h2 className="text-lg font-bold text-lila-800">Limpiar historial de un estudiante</h2>
      <p className="mt-1 text-sm text-texto-secundario">
        Borra intentos, respuestas y resultados de un estudiante. Se conserva su cuenta, curso y evaluaciones asignadas.
      </p>
      <select
        className="campo-select mt-3"
        value={seleccionado}
        onChange={(e) => {
          setSeleccionado(e.target.value);
          setMensaje(null);
        }}
      >
        <option value="">Seleccioná un estudiante…</option>
        {estudiantes.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre} {e.apellido} — {e.email}
          </option>
        ))}
      </select>

      <div className="mt-4">
        <ConfirmacionPeligrosa
          triggerLabel="Limpiar historial"
          triggerClassName="btn-peligroso"
          deshabilitadoTrigger={!seleccionado}
          titulo={`Limpiar historial de ${estudiante ? `${estudiante.nombre} ${estudiante.apellido}` : ""}`}
          descripcion="Se eliminarán sus intentos, respuestas y resultados. Su cuenta, curso y evaluaciones asignadas no se ven afectados."
          cargarResumen={async () => {
            const r = await obtenerResumenHistorialEstudiante(seleccionado);
            return [
              { etiqueta: "Intentos", valor: r.intentos },
              { etiqueta: "Respuestas", valor: r.respuestas },
              { etiqueta: "Resultados", valor: r.resultados },
            ];
          }}
          textoConfirmacion="ELIMINAR"
          labelConfirmar="Limpiar historial"
          onConfirmar={async () => {
            const r = await limpiarHistorialEstudiante(seleccionado);
            setMensaje({ tipo: r.ok ? "ok" : "error", texto: r.mensaje });
            return r;
          }}
        />
      </div>
      <Aviso mensaje={mensaje} />
    </div>
  );
}

export function SeccionLimpiarHistorialEvaluacion({ evaluaciones }: { evaluaciones: { id: string; nombre: string }[] }) {
  const [seleccionado, setSeleccionado] = useState("");
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const evaluacion = evaluaciones.find((e) => e.id === seleccionado);

  return (
    <div className="tarjeta">
      <h2 className="text-lg font-bold text-lila-800">Limpiar historial de una evaluación</h2>
      <p className="mt-1 text-sm text-texto-secundario">
        Borra todos los intentos, respuestas y resultados de una evaluación. Se conserva la evaluación, su configuración y sus preguntas.
      </p>
      <select
        className="campo-select mt-3"
        value={seleccionado}
        onChange={(e) => {
          setSeleccionado(e.target.value);
          setMensaje(null);
        }}
      >
        <option value="">Seleccioná una evaluación…</option>
        {evaluaciones.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre}
          </option>
        ))}
      </select>

      <div className="mt-4">
        <ConfirmacionPeligrosa
          triggerLabel="Limpiar historial"
          triggerClassName="btn-peligroso"
          deshabilitadoTrigger={!seleccionado}
          titulo={`Limpiar historial de "${evaluacion?.nombre ?? ""}"`}
          descripcion="Se eliminarán todos los intentos, respuestas y resultados de esta evaluación. Volverá a aparecer como no realizada."
          cargarResumen={async () => {
            const r = await obtenerResumenHistorialEvaluacion(seleccionado);
            return [
              { etiqueta: "Intentos", valor: r.intentos },
              { etiqueta: "Respuestas", valor: r.respuestas },
              { etiqueta: "Resultados", valor: r.resultados },
            ];
          }}
          textoConfirmacion="ELIMINAR"
          labelConfirmar="Limpiar historial"
          onConfirmar={async () => {
            const r = await limpiarHistorialEvaluacion(seleccionado);
            setMensaje({ tipo: r.ok ? "ok" : "error", texto: r.mensaje });
            return r;
          }}
        />
      </div>
      <Aviso mensaje={mensaje} />
    </div>
  );
}

export function SeccionEliminarEvaluacion({ evaluaciones }: { evaluaciones: { id: string; nombre: string }[] }) {
  const [seleccionado, setSeleccionado] = useState("");
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const evaluacion = evaluaciones.find((e) => e.id === seleccionado);

  return (
    <div className="tarjeta">
      <h2 className="text-lg font-bold text-lila-800">Eliminar una evaluación</h2>
      <p className="mt-1 text-sm text-texto-secundario">
        Elimina definitivamente la evaluación junto con sus asignaciones, relaciones con preguntas, intentos, respuestas y resultados.
      </p>
      <select
        className="campo-select mt-3"
        value={seleccionado}
        onChange={(e) => {
          setSeleccionado(e.target.value);
          setMensaje(null);
        }}
      >
        <option value="">Seleccioná una evaluación…</option>
        {evaluaciones.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre}
          </option>
        ))}
      </select>

      <div className="mt-4">
        <ConfirmacionPeligrosa
          triggerLabel="Eliminar evaluación"
          triggerClassName="btn-peligroso"
          deshabilitadoTrigger={!seleccionado}
          titulo={`Eliminar "${evaluacion?.nombre ?? ""}"`}
          descripcion="Se eliminará la evaluación y todo lo relacionado con ella. Esta es una eliminación completa, no solo del historial."
          cargarResumen={async () => {
            const r = await obtenerResumenEliminacionEvaluacion(seleccionado);
            return [
              { etiqueta: "Asignaciones a cursos", valor: r.asignaciones },
              { etiqueta: "Preguntas vinculadas", valor: r.preguntasVinculadas },
              { etiqueta: "Intentos", valor: r.intentos },
              { etiqueta: "Respuestas", valor: r.respuestas },
              { etiqueta: "Resultados", valor: r.resultados },
            ];
          }}
          textoConfirmacion="ELIMINAR"
          labelConfirmar="Eliminar evaluación"
          onConfirmar={async () => {
            const r = await eliminarEvaluacion(seleccionado);
            setMensaje({ tipo: r.ok ? "ok" : "error", texto: r.mensaje });
            return r;
          }}
        />
      </div>
      <Aviso mensaje={mensaje} />
    </div>
  );
}

export function SeccionLimpiezaGeneral() {
  const [mensaje, setMensaje] = useState<Mensaje>(null);

  return (
    <div className="tarjeta border-error/30">
      <h2 className="text-lg font-bold text-lila-800">Limpieza general de resultados</h2>
      <p className="mt-1 text-sm text-texto-secundario">
        Borra todos los intentos y resultados del sistema completo. No elimina usuarios, cursos, evaluaciones ni preguntas.
      </p>
      <div className="mt-4">
        <ConfirmacionPeligrosa
          triggerLabel="Limpieza general de resultados"
          triggerClassName="btn-peligroso"
          titulo="Limpieza general de resultados"
          descripcion="Se eliminarán TODOS los intentos, respuestas y resultados del sistema, de todos los estudiantes y evaluaciones."
          advertenciaExtra="Esta acción afecta a todo el sistema, no a un estudiante o evaluación en particular."
          cargarResumen={async () => {
            const r = await obtenerResumenLimpiezaGeneral();
            return [
              { etiqueta: "Intentos", valor: r.intentos },
              { etiqueta: "Respuestas", valor: r.respuestas },
              { etiqueta: "Resultados", valor: r.resultados },
            ];
          }}
          textoConfirmacion="LIMPIAR HISTORIAL"
          labelConfirmar="Limpiar todo el historial"
          onConfirmar={async () => {
            const r = await limpiarHistorialGeneral("LIMPIAR HISTORIAL");
            setMensaje({ tipo: r.ok ? "ok" : "error", texto: r.mensaje });
            return r;
          }}
        />
      </div>
      <Aviso mensaje={mensaje} />
    </div>
  );
}
