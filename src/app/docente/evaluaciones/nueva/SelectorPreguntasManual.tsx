"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { DIFICULTADES, EJES, type Pregunta } from "@/lib/types";

/**
 * Selección manual de preguntas para una evaluación: a la izquierda el
 * banco (buscable y filtrable), a la derecha la lista de elegidas en el
 * orden en que el estudiante las va a ver, con botones para reordenar y
 * quitar. La cantidad siempre sale de `seleccionadas.length` — nunca se le
 * pide un número al docente ni se completa nada al azar.
 */
export function SelectorPreguntasManual({
  preguntas,
  seleccionadas,
  onCambiarSeleccion,
}: {
  preguntas: Pregunta[];
  seleccionadas: string[];
  onCambiarSeleccion: (ids: string[]) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEje, setFiltroEje] = useState("");
  const [filtroContenido, setFiltroContenido] = useState("");
  const [filtroDificultad, setFiltroDificultad] = useState("");

  const porId = useMemo(() => new Map(preguntas.map((p) => [p.id, p])), [preguntas]);
  const seleccionadasSet = useMemo(() => new Set(seleccionadas), [seleccionadas]);

  const contenidos = useMemo(
    () => Array.from(new Set(preguntas.map((p) => p.contenido))).sort((a, b) => a.localeCompare(b, "es")),
    [preguntas]
  );

  const preguntasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return preguntas.filter((p) => {
      if (filtroEje && p.eje !== filtroEje) return false;
      if (filtroContenido && p.contenido !== filtroContenido) return false;
      if (filtroDificultad && p.dificultad !== filtroDificultad) return false;
      if (termino && !p.codigo.toLowerCase().includes(termino) && !p.enunciado.toLowerCase().includes(termino)) {
        return false;
      }
      return true;
    });
  }, [preguntas, busqueda, filtroEje, filtroContenido, filtroDificultad]);

  function alternar(id: string) {
    if (seleccionadasSet.has(id)) {
      onCambiarSeleccion(seleccionadas.filter((s) => s !== id));
    } else {
      onCambiarSeleccion([...seleccionadas, id]);
    }
  }

  function quitar(id: string) {
    onCambiarSeleccion(seleccionadas.filter((s) => s !== id));
  }

  function mover(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= seleccionadas.length) return;
    const copia = seleccionadas.slice();
    [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
    onCambiarSeleccion(copia);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-lila-800">Banco de preguntas</h3>
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código o texto..."
            aria-label="Buscar por código o texto"
            className="campo-texto sm:col-span-2"
          />
          <select
            value={filtroEje}
            onChange={(e) => setFiltroEje(e.target.value)}
            aria-label="Filtrar por eje"
            className="campo-select"
          >
            <option value="">Todos los ejes</option>
            {EJES.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
          <select
            value={filtroDificultad}
            onChange={(e) => setFiltroDificultad(e.target.value)}
            aria-label="Filtrar por dificultad"
            className="campo-select"
          >
            <option value="">Toda dificultad</option>
            {DIFICULTADES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <select
            value={filtroContenido}
            onChange={(e) => setFiltroContenido(e.target.value)}
            aria-label="Filtrar por contenido"
            className="campo-select sm:col-span-2"
          >
            <option value="">Todo contenido</option>
            {contenidos.map((c) => (
              <option key={c} value={c}>
                {c}
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
                checked={seleccionadasSet.has(pregunta.id)}
                onChange={() => alternar(pregunta.id)}
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

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-lila-800">
          Preguntas elegidas ({seleccionadas.length})
        </h3>
        <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-100">
          {seleccionadas.map((id, indice) => {
            const pregunta = porId.get(id);
            return (
              <div
                key={id}
                className="flex items-start gap-2 border-b border-slate-100 p-3 text-sm last:border-0"
              >
                <span className="mt-0.5 w-5 shrink-0 text-right text-xs text-slate-400">{indice + 1}.</span>
                <span className="flex-1">
                  {pregunta ? (
                    <>
                      <span className="font-mono text-xs text-slate-400">{pregunta.codigo}</span>{" "}
                      <span className="text-slate-800">{pregunta.enunciado}</span>
                    </>
                  ) : (
                    <span className="italic text-slate-400">Pregunta no disponible (id {id})</span>
                  )}
                </span>
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => mover(indice, -1)}
                    disabled={indice === 0}
                    aria-label="Subir"
                    className="rounded p-0.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(indice, 1)}
                    disabled={indice === seleccionadas.length - 1}
                    aria-label="Bajar"
                    className="rounded p-0.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => quitar(id)}
                  aria-label="Quitar de la evaluación"
                  className="shrink-0 rounded p-1 text-amarillo-700 hover:bg-amarillo-50"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
          {seleccionadas.length === 0 && (
            <p className="p-4 text-center text-sm text-slate-400">Todavía no elegiste ninguna pregunta.</p>
          )}
        </div>
      </div>
    </div>
  );
}
