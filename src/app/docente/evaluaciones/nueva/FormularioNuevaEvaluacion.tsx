"use client";

import { useActionState, useMemo, useState } from "react";
import { EJES, type Curso, type Pregunta } from "@/lib/types";
import { crearEvaluacionAutomatica, crearEvaluacionManual, type EstadoFormularioEvaluacion } from "../actions";

const ESTADO_INICIAL: EstadoFormularioEvaluacion = { error: null };

async function despachar(estado: EstadoFormularioEvaluacion, formData: FormData) {
  const tipo = formData.get("tipo");
  if (tipo === "manual") return crearEvaluacionManual(estado, formData);
  return crearEvaluacionAutomatica(estado, formData);
}

export function FormularioNuevaEvaluacion({
  cursos,
  preguntas,
}: {
  cursos: Curso[];
  preguntas: Pregunta[];
  docenteNombre: string;
}) {
  const [estado, formAction, enviando] = useActionState(despachar, ESTADO_INICIAL);
  const [tipo, setTipo] = useState<"manual" | "automatica">("automatica");
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [filtroEje, setFiltroEje] = useState("");

  const preguntasFiltradas = useMemo(
    () => (filtroEje ? preguntas.filter((p) => p.eje === filtroEje) : preguntas),
    [preguntas, filtroEje]
  );

  const disponiblesPorEje = useMemo(() => {
    const conteo: Record<string, number> = {};
    for (const p of preguntas) conteo[p.eje] = (conteo[p.eje] ?? 0) + 1;
    return conteo;
  }, [preguntas]);

  function alternarPregunta(id: string) {
    setSeleccionadas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="tipo" value={tipo} />

      <div className="flex gap-2 rounded-lg bg-slate-100 p-1 text-sm font-medium w-fit">
        <button
          type="button"
          onClick={() => setTipo("automatica")}
          className={`rounded-md px-4 py-1.5 ${tipo === "automatica" ? "bg-white text-lila-800 shadow-sm" : "text-slate-600"}`}
        >
          Selección automática
        </button>
        <button
          type="button"
          onClick={() => setTipo("manual")}
          className={`rounded-md px-4 py-1.5 ${tipo === "manual" ? "bg-white text-lila-800 shadow-sm" : "text-slate-600"}`}
        >
          Selección manual
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <Campo label="Nombre de la evaluación" htmlFor="nombre" className="sm:col-span-2">
          <input id="nombre" name="nombre" type="text" required className="campo-texto" />
        </Campo>
        <Campo label="Descripción" htmlFor="descripcion" className="sm:col-span-2">
          <textarea id="descripcion" name="descripcion" rows={2} className="campo-texto" />
        </Campo>
        <Campo label="Curso" htmlFor="curso_id">
          <select id="curso_id" name="curso_id" required defaultValue="" className="campo-select">
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
          <input id="duracion_minutos" name="duracion_minutos" type="number" min={1} defaultValue={60} required className="campo-texto" />
        </Campo>
        <Campo label="Fecha y hora de apertura" htmlFor="fecha_apertura">
          <input id="fecha_apertura" name="fecha_apertura" type="datetime-local" className="campo-texto" />
        </Campo>
        <Campo label="Fecha y hora de cierre" htmlFor="fecha_cierre">
          <input id="fecha_cierre" name="fecha_cierre" type="datetime-local" className="campo-texto" />
        </Campo>
        <Campo label="Intentos máximos" htmlFor="intentos_max">
          <input id="intentos_max" name="intentos_max" type="number" min={1} defaultValue={1} required className="campo-texto" />
        </Campo>
        <Campo label="Puntaje mínimo de aprobación (%)" htmlFor="puntaje_aprobacion">
          <input id="puntaje_aprobacion" name="puntaje_aprobacion" type="number" min={0} max={100} defaultValue={60} required className="campo-texto" />
        </Campo>
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <Checkbox name="orden_aleatorio_preguntas" label="Orden aleatorio de preguntas" defaultChecked />
        <Checkbox name="orden_aleatorio_opciones" label="Orden aleatorio de las opciones" defaultChecked />
        <Checkbox name="mostrar_resultado_inmediato" label="Mostrar resultado inmediatamente al entregar" defaultChecked />
        <Checkbox name="permitir_revision" label="Permitir revisar las respuestas" defaultChecked />
        <Checkbox name="mostrar_resoluciones" label="Mostrar resoluciones paso a paso" defaultChecked />
        <Checkbox name="permitir_calculadora" label="Permitir uso de calculadora" />
        <Checkbox name="permitir_hoja_formulas" label="Permitir hoja de fórmulas" />
        <Checkbox name="descuento_por_incorrecta" label="Aplicar descuento por respuesta incorrecta" />
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
                  defaultValue={0}
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
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-lila-800">Seleccioná las preguntas ({seleccionadas.size})</h2>
            <select value={filtroEje} onChange={(e) => setFiltroEje(e.target.value)} className="campo-select w-auto">
              <option value="">Todos los ejes</option>
              {EJES.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-100">
            {preguntasFiltradas.map((pregunta) => (
              <label
                key={pregunta.id}
                className="flex cursor-pointer items-start gap-3 border-b border-slate-100 p-3 text-sm last:border-0 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  name="pregunta_ids"
                  value={pregunta.id}
                  checked={seleccionadas.has(pregunta.id)}
                  onChange={() => alternarPregunta(pregunta.id)}
                  className="mt-1"
                />
                <span>
                  <span className="font-mono text-xs text-slate-400">{pregunta.codigo}</span>{" "}
                  <span className="text-slate-800">{pregunta.enunciado}</span>
                </span>
              </label>
            ))}
            {preguntasFiltradas.length === 0 && (
              <p className="p-4 text-center text-sm text-slate-400">No hay preguntas activas para este filtro.</p>
            )}
          </div>
        </div>
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
        {enviando ? "Creando..." : "Crear evaluación"}
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
