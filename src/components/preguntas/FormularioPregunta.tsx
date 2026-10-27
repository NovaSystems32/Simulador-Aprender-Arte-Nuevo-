"use client";

import { useActionState, useEffect, useState } from "react";
import { CAPACIDADES, DIFICULTADES, EJES, type Pregunta } from "@/lib/types";
import { CampoTextoConEcuaciones } from "./CampoTextoConEcuaciones";
import type { EstadoFormularioPregunta } from "@/app/docente/preguntas/actions";

const ESTADO_INICIAL: EstadoFormularioPregunta = { error: null, ok: false };

export function FormularioPregunta({
  accion,
  pregunta,
  onExito,
}: {
  accion: (estado: EstadoFormularioPregunta, formData: FormData) => Promise<EstadoFormularioPregunta>;
  pregunta?: Pregunta;
  onExito?: (estado: EstadoFormularioPregunta) => void;
}) {
  const [estado, formAction, enviando] = useActionState(accion, ESTADO_INICIAL);
  const [opciones, setOpciones] = useState({
    a: pregunta?.opcion_a ?? "",
    b: pregunta?.opcion_b ?? "",
    c: pregunta?.opcion_c ?? "",
    d: pregunta?.opcion_d ?? "",
  });
  const [enunciado, setEnunciado] = useState(pregunta?.enunciado ?? "");
  const [explicacion, setExplicacion] = useState(pregunta?.explicacion ?? "");

  useEffect(() => {
    if (estado.ok) onExito?.(estado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.ok]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="sr-only">Clasificación de la pregunta</legend>
        <Campo label="Eje matemático" htmlFor="eje">
          <select
            id="eje"
            name="eje"
            defaultValue={pregunta?.eje ?? ""}
            required
            className="campo-select"
          >
            <option value="" disabled>
              Seleccioná un eje
            </option>
            {EJES.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Contenido específico" htmlFor="contenido">
          <input
            id="contenido"
            name="contenido"
            type="text"
            defaultValue={pregunta?.contenido ?? ""}
            required
            placeholder="Ej: Porcentajes, aumentos y descuentos"
            className="campo-texto"
          />
        </Campo>

        <Campo label="Capacidad evaluada" htmlFor="capacidad">
          <select id="capacidad" name="capacidad" defaultValue={pregunta?.capacidad ?? ""} required className="campo-select">
            <option value="" disabled>
              Seleccioná una capacidad
            </option>
            {CAPACIDADES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Nivel de dificultad" htmlFor="dificultad">
          <select id="dificultad" name="dificultad" defaultValue={pregunta?.dificultad ?? ""} required className="campo-select">
            <option value="" disabled>
              Seleccioná una dificultad
            </option>
            {DIFICULTADES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </Campo>
      </fieldset>

      <CampoTextoConEcuaciones
        id="enunciado"
        name="enunciado"
        label="Enunciado"
        required
        rows={4}
        value={enunciado}
        onChange={setEnunciado}
        ayuda="Para fórmulas usá el botón «Ecuación (fx)»: se arman con casilleros, sin escribir código."
      />

      <Campo label="Recurso visual (URL de imagen, opcional)" htmlFor="recurso_url">
        <input
          id="recurso_url"
          name="recurso_url"
          type="url"
          defaultValue={pregunta?.recurso_url ?? ""}
          placeholder="https://..."
          className="campo-texto"
        />
      </Campo>
      <Campo label="Texto alternativo del recurso (accesibilidad)" htmlFor="recurso_alt">
        <input
          id="recurso_alt"
          name="recurso_alt"
          type="text"
          defaultValue={pregunta?.recurso_alt ?? ""}
          placeholder="Describí brevemente la imagen o el gráfico"
          className="campo-texto"
        />
      </Campo>

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <legend className="text-sm font-medium text-slate-700">Opciones de respuesta</legend>
        {(["a", "b", "c", "d"] as const).map((letra) => (
          <CampoTextoConEcuaciones
            key={letra}
            id={`opcion_${letra}`}
            name={`opcion_${letra}`}
            label={`Opción ${letra.toUpperCase()}`}
            required
            rows={2}
            value={opciones[letra]}
            onChange={(valor) => setOpciones((prev) => ({ ...prev, [letra]: valor }))}
          />
        ))}
      </fieldset>

      <Campo label="Respuesta correcta" htmlFor="respuesta_correcta">
        <div className="flex gap-4">
          {(["A", "B", "C", "D"] as const).map((letra) => (
            <label key={letra} className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="respuesta_correcta"
                value={letra}
                defaultChecked={pregunta?.respuesta_correcta === letra}
                required
              />
              {letra}
            </label>
          ))}
        </div>
      </Campo>

      <CampoTextoConEcuaciones
        id="explicacion"
        name="explicacion"
        label="Explicación de la resolución (paso a paso)"
        required
        rows={4}
        value={explicacion}
        onChange={setExplicacion}
      />

      <Campo label="Estado" htmlFor="estado">
        <select id="estado" name="estado" defaultValue={pregunta?.estado ?? "borrador"} className="campo-select">
          <option value="borrador">Borrador</option>
          <option value="activa">Activa</option>
          <option value="archivada">Archivada</option>
        </select>
      </Campo>

      {estado.error && (
        <p role="alert" className="rounded-md bg-error-50 px-3 py-2 text-sm text-error">
          {estado.error}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="rounded-md bg-exito-50 px-3 py-2 text-sm text-exito">
          {estado.mensaje ?? "Guardado correctamente."}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="self-start rounded-lg bg-lila-600 px-5 py-2.5 font-semibold text-white hover:bg-lila-800 disabled:opacity-60"
      >
        {enviando ? "Guardando..." : "Guardar pregunta"}
      </button>
    </form>
  );
}

function Campo({
  label,
  htmlFor,
  ayuda,
  children,
}: {
  label: string;
  htmlFor: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {ayuda && <p className="text-xs text-slate-500">{ayuda}</p>}
    </div>
  );
}
