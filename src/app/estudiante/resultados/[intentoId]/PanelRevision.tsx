"use client";

import { useState } from "react";
import { TextoConFormulas } from "@/components/preguntas/VistaPreviaMatematica";
import type { OpcionLetra } from "@/lib/types";

interface PreguntaRevision {
  pregunta_id: string;
  orden: number;
  enunciado: string;
  recurso_url: string | null;
  recurso_alt: string | null;
  opciones: { letra: OpcionLetra; texto: string }[];
  respuesta_correcta: OpcionLetra;
  explicacion: string | null;
  contenido: string;
  respuesta_seleccionada: OpcionLetra | null;
}

export function PanelRevision({ intentoId }: { intentoId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [preguntas, setPreguntas] = useState<PreguntaRevision[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function abrir() {
    setAbierto(true);
    if (preguntas) return;
    setCargando(true);
    try {
      const res = await fetch(`/api/intentos/${intentoId}/revision`);
      const datos = await res.json();
      if (!res.ok) {
        setError(datos.error ?? "No se pudo cargar la revisión.");
      } else {
        setPreguntas(datos.preguntas);
      }
    } catch {
      setError("No se pudo cargar la revisión.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <button
        type="button"
        onClick={abierto ? () => setAbierto(false) : abrir}
        className="font-semibold text-lila-800 hover:underline"
      >
        {abierto ? "Ocultar revisión de respuestas ▲" : "Revisar mis respuestas ▼"}
      </button>

      {abierto && (
        <div className="mt-4 flex flex-col gap-5">
          {cargando && <p className="text-sm text-slate-500">Cargando...</p>}
          {error && <p className="text-sm text-error">{error}</p>}
          {preguntas?.map((p, i) => {
            const correcta = p.respuesta_seleccionada === p.respuesta_correcta;
            return (
              <div key={p.pregunta_id} className="border-b border-slate-100 pb-5 last:border-0">
                <p className="text-xs font-medium text-slate-400">
                  Pregunta {i + 1} · {p.contenido}
                </p>
                <p className="mt-1 text-slate-800">
                  <TextoConFormulas texto={p.enunciado} />
                </p>
                {p.recurso_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.recurso_url}
                    alt={p.recurso_alt ?? "Recurso visual de la pregunta"}
                    className="mt-3 max-h-64 rounded-lg border border-slate-200"
                  />
                )}
                <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                  {p.opciones.map((o) => {
                    const esCorrecta = o.letra === p.respuesta_correcta;
                    const esSeleccionada = o.letra === p.respuesta_seleccionada;
                    return (
                      <li
                        key={o.letra}
                        className={`rounded-md border px-3 py-1.5 ${
                          esCorrecta
                            ? "border-exito bg-exito-50"
                            : esSeleccionada
                              ? "border-error bg-error-50"
                              : "border-slate-200"
                        }`}
                      >
                        <span className="font-semibold">{o.letra})</span> <TextoConFormulas texto={o.texto} />
                        {esCorrecta && <span className="ml-2 text-xs font-medium text-exito">Respuesta correcta</span>}
                        {esSeleccionada && !esCorrecta && (
                          <span className="ml-2 text-xs font-medium text-error">Tu respuesta</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {!p.respuesta_seleccionada && (
                  <p className="mt-2 text-xs text-advertencia">No respondiste esta pregunta.</p>
                )}
                {p.explicacion && (
                  <p className="mt-2 rounded-md bg-lila-100 p-3 text-sm text-lila-800">
                    <span className="font-semibold">Resolución: </span>
                    <TextoConFormulas texto={p.explicacion} />
                  </p>
                )}
                {!correcta && (
                  <p className="mt-1 text-xs text-slate-500">Sugerencia: revisá el contenido &quot;{p.contenido}&quot;.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
