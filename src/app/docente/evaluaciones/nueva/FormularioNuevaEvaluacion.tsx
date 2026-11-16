"use client";

import { useActionState, useState } from "react";
import { EJES, type Curso, type Evaluacion, type Pregunta } from "@/lib/types";
import {
  actualizarEvaluacionAutomatica,
  actualizarEvaluacionManual,
  crearEvaluacionAutomatica,
  crearEvaluacionManual,
  type EstadoFormularioEvaluacion,
} from "../actions";
import { SelectorPreguntasManual } from "./SelectorPreguntasManual";

const ESTADO_INICIAL: EstadoFormularioEvaluacion = { error: null };

/** "2026-03-05T10:30:00.000Z" -> "2026-03-05T07:30" (horario local, formato que acepta <input type="datetime-local">). */
function aDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const fecha = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`;
}

export function FormularioNuevaEvaluacion({
  cursos,
  preguntas,
  evaluacionExistente,
  preguntaIdsSeleccionadasIniciales,
}: {
  cursos: Curso[];
  preguntas: Pregunta[];
  docenteNombre: string;
  /** Si viene, el formulario edita este borrador en vez de crear uno nuevo. */
  evaluacionExistente?: Evaluacion;
  preguntaIdsSeleccionadasIniciales?: string[];
}) {
  const editando = Boolean(evaluacionExistente);

  async function despachar(estado: EstadoFormularioEvaluacion, formData: FormData) {
    const tipoEnviado = formData.get("tipo");
    if (evaluacionExistente) {
      return tipoEnviado === "manual"
        ? actualizarEvaluacionManual(evaluacionExistente.id, estado, formData)
        : actualizarEvaluacionAutomatica(evaluacionExistente.id, estado, formData);
    }
    return tipoEnviado === "manual" ? crearEvaluacionManual(estado, formData) : crearEvaluacionAutomatica(estado, formData);
  }

  const [estado, formAction, enviando] = useActionState(despachar, ESTADO_INICIAL);
  const [tipo, setTipo] = useState<"manual" | "automatica">(evaluacionExistente?.tipo ?? "automatica");
  const [seleccionadas, setSeleccionadas] = useState<string[]>(preguntaIdsSeleccionadasIniciales ?? []);

  const distribucionInicial = new Map(
    (evaluacionExistente?.config_automatica?.distribucion ?? []).map((d) => [d.eje, d.cantidad])
  );

  const disponiblesPorEje = (() => {
    const conteo: Record<string, number> = {};
    for (const p of preguntas) conteo[p.eje] = (conteo[p.eje] ?? 0) + 1;
    return conteo;
  })();

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="tipo" value={tipo} />

      <div className="flex gap-2 rounded-lg bg-slate-100 p-1 text-sm font-medium w-fit">
        <button
          type="button"
          disabled={editando}
          onClick={() => setTipo("automatica")}
          className={`rounded-md px-4 py-1.5 disabled:cursor-not-allowed ${tipo === "automatica" ? "bg-white text-lila-800 shadow-sm" : "text-slate-500"}`}
        >
          Selección automática
        </button>
        <button
          type="button"
          disabled={editando}
          onClick={() => setTipo("manual")}
          className={`rounded-md px-4 py-1.5 disabled:cursor-not-allowed ${tipo === "manual" ? "bg-white text-lila-800 shadow-sm" : "text-slate-500"}`}
        >
          Elegir preguntas del banco
        </button>
      </div>
      {editando && (
        <p className="-mt-4 text-xs text-slate-400">
          El tipo de evaluación no se puede cambiar al editar un borrador. Para cambiarlo, creá una evaluación nueva.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <Campo label="Nombre de la evaluación" htmlFor="nombre" className="sm:col-span-2">
          <input
            id="nombre"
            name="nombre"
            type="text"
            required
            defaultValue={evaluacionExistente?.nombre}
            className="campo-texto"
          />
        </Campo>
        <Campo label="Descripción" htmlFor="descripcion" className="sm:col-span-2">
          <textarea
            id="descripcion"
            name="descripcion"
            rows={2}
            defaultValue={evaluacionExistente?.descripcion ?? ""}
            className="campo-texto"
          />
        </Campo>
        <Campo label="Curso" htmlFor="curso_id">
          <select
            id="curso_id"
            name="curso_id"
            required
            defaultValue={evaluacionExistente?.curso_id ?? ""}
            className="campo-select"
          >
            <option value="" disabled>
              Seleccioná un curso
            </option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} &quot;{c.division}&quot;
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Duración (minutos)" htmlFor="duracion_minutos">
          <input
            id="duracion_minutos"
            name="duracion_minutos"
            type="number"
            min={1}
            defaultValue={evaluacionExistente?.duracion_minutos ?? 60}
            required
            className="campo-texto"
          />
        </Campo>
        <Campo label="Fecha y hora de apertura" htmlFor="fecha_apertura">
          <input
            id="fecha_apertura"
            name="fecha_apertura"
            type="datetime-local"
            defaultValue={aDatetimeLocal(evaluacionExistente?.fecha_apertura ?? null)}
            className="campo-texto"
          />
        </Campo>
        <Campo label="Fecha y hora de cierre" htmlFor="fecha_cierre">
          <input
            id="fecha_cierre"
            name="fecha_cierre"
            type="datetime-local"
            defaultValue={aDatetimeLocal(evaluacionExistente?.fecha_cierre ?? null)}
            className="campo-texto"
          />
        </Campo>
        <Campo label="Intentos máximos" htmlFor="intentos_max">
          <input
            id="intentos_max"
            name="intentos_max"
            type="number"
            min={1}
            defaultValue={evaluacionExistente?.intentos_max ?? 1}
            required
            className="campo-texto"
          />
        </Campo>
        <Campo label="Puntaje mínimo de aprobación (%)" htmlFor="puntaje_aprobacion">
          <input
            id="puntaje_aprobacion"
            name="puntaje_aprobacion"
            type="number"
            min={0}
            max={100}
            defaultValue={evaluacionExistente?.puntaje_aprobacion ?? 60}
            required
            className="campo-texto"
          />
        </Campo>
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <Checkbox
          name="orden_aleatorio_preguntas"
          label="Orden aleatorio de preguntas"
          defaultChecked={evaluacionExistente?.orden_aleatorio_preguntas ?? true}
        />
        <Checkbox
          name="orden_aleatorio_opciones"
          label="Orden aleatorio de las opciones"
          defaultChecked={evaluacionExistente?.orden_aleatorio_opciones ?? true}
        />
        <Checkbox
          name="mostrar_resultado_inmediato"
          label="Mostrar resultado inmediatamente al entregar"
          defaultChecked={evaluacionExistente?.mostrar_resultado_inmediato ?? true}
        />
        <Checkbox
          name="permitir_revision"
          label="Permitir revisar las respuestas"
          defaultChecked={evaluacionExistente?.permitir_revision ?? true}
        />
        <Checkbox
          name="mostrar_resoluciones"
          label="Mostrar resoluciones paso a paso"
          defaultChecked={evaluacionExistente?.mostrar_resoluciones ?? true}
        />
        <Checkbox
          name="permitir_calculadora"
          label="Permitir uso de calculadora"
          defaultChecked={evaluacionExistente?.permitir_calculadora ?? false}
        />
        <Checkbox
          name="permitir_hoja_formulas"
          label="Permitir hoja de fórmulas"
          defaultChecked={evaluacionExistente?.permitir_hoja_formulas ?? false}
        />
        <Checkbox
          name="descuento_por_incorrecta"
          label="Aplicar descuento por respuesta incorrecta"
          defaultChecked={evaluacionExistente?.descuento_por_incorrecta ?? false}
        />
      </div>

      {tipo === "automatica" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold text-lila-800">Distribución de preguntas por eje</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EJES.map((eje) => (
              <Campo key={eje.value} label={eje.label} htmlFor={`cantidad_${eje.value}`}>
                <input
                  id={`cantidad_${eje.value}`}
                  name={`cantidad_${eje.value}`}
                  type="number"
                  min={0}
                  max={disponiblesPorEje[eje.value] ?? 0}
                  defaultValue={distribucionInicial.get(eje.value) ?? 0}
                  className="campo-texto"
                />
                <p className="mt-1 text-xs text-slate-400">
                  {disponiblesPorEje[eje.value] ?? 0} disponibles
                </p>
              </Campo>
            ))}
          </div>
        </div>
      ) : (
        <>
          <SelectorPreguntasManual preguntas={preguntas} seleccionadas={seleccionadas} onCambiarSeleccion={setSeleccionadas} />
          {seleccionadas.map((id) => (
            <input key={id} type="hidden" name="pregunta_ids" value={id} />
          ))}
        </>
      )}

      {estado.error && (
        <p role="alert" className="rounded-md bg-error-50 px-3 py-2 text-sm text-error">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="self-start rounded-lg bg-lila-600 px-5 py-2.5 font-semibold text-white hover:bg-lila-800 disabled:opacity-60"
      >
        {enviando ? "Guardando..." : editando ? "Guardar cambios" : "Crear evaluación"}
      </button>
    </form>
  );
}

function Campo({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}
