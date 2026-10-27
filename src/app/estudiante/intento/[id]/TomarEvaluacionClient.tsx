"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Check, Clock, Flag, ScrollText } from "lucide-react";
import { TextoConFormulas } from "@/components/preguntas/VistaPreviaMatematica";
import { CalculadoraSimple } from "@/components/examen/CalculadoraSimple";
import { HojaFormulas } from "@/components/examen/HojaFormulas";
import { Logo } from "@/components/Logo";
import type { OpcionLetra, PreguntaIntentoPublica } from "@/lib/types";

interface RespuestaLocal {
  opcion_seleccionada: OpcionLetra | null;
  marcada_para_revisar: boolean;
}

interface DatosIntento {
  estado: string;
  evaluacion?: { nombre: string; permitirCalculadora: boolean; permitirHojaFormulas: boolean };
  tiempoLimiteSegundos?: number;
  tiempoRestanteSegundos?: number;
  preguntas?: PreguntaIntentoPublica[];
  respuestas?: { pregunta_id: string; opcion_seleccionada: OpcionLetra | null; marcada_para_revisar: boolean }[];
  entregadoAutomaticamente?: boolean;
}

function formatearTiempo(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function TomarEvaluacionClient({ intentoId }: { intentoId: string }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datos, setDatos] = useState<DatosIntento | null>(null);
  const [respuestas, setRespuestas] = useState<Record<string, RespuestaLocal>>({});
  const [indice, setIndice] = useState(0);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [entregando, setEntregando] = useState(false);
  const [mostrarCalculadora, setMostrarCalculadora] = useState(false);
  const [mostrarFormulas, setMostrarFormulas] = useState(false);
  const entregadoRef = useRef(false);

  const entregar = useCallback(async () => {
    if (entregadoRef.current) return;
    entregadoRef.current = true;
    setEntregando(true);
    try {
      await fetch(`/api/intentos/${intentoId}/entregar`, { method: "POST" });
    } finally {
      router.push(`/estudiante/resultados/${intentoId}`);
    }
  }, [intentoId, router]);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/intentos/${intentoId}`)
      .then((r) => r.json())
      .then((json: DatosIntento) => {
        if (cancelado) return;
        if (json.estado !== "en_curso") {
          router.push(`/estudiante/resultados/${intentoId}`);
          return;
        }
        setDatos(json);
        setTiempoRestante(json.tiempoRestanteSegundos ?? 0);
        const mapa: Record<string, RespuestaLocal> = {};
        for (const r of json.respuestas ?? []) {
          mapa[r.pregunta_id] = {
            opcion_seleccionada: r.opcion_seleccionada,
            marcada_para_revisar: r.marcada_para_revisar,
          };
        }
        setRespuestas(mapa);
        setCargando(false);
      })
      .catch(() => {
        if (!cancelado) {
          setError("No se pudo cargar la evaluación. Revisá tu conexión e intentá de nuevo.");
          setCargando(false);
        }
      });
    return () => {
      cancelado = true;
    };
  }, [intentoId, router]);

  useEffect(() => {
    if (cargando || !datos) return;
    if (tiempoRestante <= 0) {
      entregar();
      return;
    }
    const t = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          entregar();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, datos]);

  const preguntas = datos?.preguntas ?? [];
  const preguntaActual = preguntas[indice];

  const conteo = useMemo(() => {
    let respondidas = 0;
    let marcadas = 0;
    for (const p of datos?.preguntas ?? []) {
      const r = respuestas[p.pregunta_id];
      if (r?.opcion_seleccionada) respondidas += 1;
      if (r?.marcada_para_revisar) marcadas += 1;
    }
    return { respondidas, marcadas, sinResponder: (datos?.preguntas?.length ?? 0) - respondidas };
  }, [datos?.preguntas, respuestas]);

  function guardarRespuesta(preguntaId: string, cambios: Partial<RespuestaLocal>) {
    setRespuestas((prev) => {
      const actual = prev[preguntaId] ?? { opcion_seleccionada: null, marcada_para_revisar: false };
      const nuevo = { ...actual, ...cambios };
      fetch(`/api/intentos/${intentoId}/respuesta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preguntaId,
          opcionSeleccionada: nuevo.opcion_seleccionada,
          marcadaParaRevisar: nuevo.marcada_para_revisar,
        }),
      }).catch(() => {
        /* el usuario puede reintentar navegando; no bloqueamos la interacción */
      });
      return { ...prev, [preguntaId]: nuevo };
    });
  }

  if (cargando) {
    return <p className="p-8 text-center text-texto-secundario">Cargando evaluación...</p>;
  }
  if (error || !datos || preguntas.length === 0) {
    return (
      <p role="alert" className="alerta-error m-4">
        {error ?? "No se pudieron cargar las preguntas de esta evaluación."}
      </p>
    );
  }

  const respuestaActual = respuestas[preguntaActual.pregunta_id];
  const tiempoBajo = tiempoRestante <= 300;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 pb-24 pt-4">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-borde bg-blanco/95 px-1 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Logo tamano="sm" />
          <div>
            <p className="text-sm font-semibold text-lila-800">{datos.evaluacion?.nombre}</p>
            <p className="text-xs text-texto-secundario">
              Pregunta {indice + 1} de {preguntas.length} · {conteo.respondidas} respondidas · {conteo.sinResponder} pendientes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {datos.evaluacion?.permitirCalculadora && (
            <button
              type="button"
              onClick={() => setMostrarCalculadora((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-borde px-3 py-1.5 text-xs font-medium text-texto-secundario hover:bg-lila-50"
            >
              <Calculator size={16} aria-hidden /> Calculadora
            </button>
          )}
          {datos.evaluacion?.permitirHojaFormulas && (
            <button
              type="button"
              onClick={() => setMostrarFormulas((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-borde px-3 py-1.5 text-xs font-medium text-texto-secundario hover:bg-lila-50"
            >
              <ScrollText size={16} aria-hidden /> Hoja de fórmulas
            </button>
          )}
          <div
            role="timer"
            aria-live="polite"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold ${
              tiempoBajo ? "bg-error-50 text-error" : "bg-lila-100 text-lila-800"
            }`}
          >
            <Clock size={16} aria-hidden />
            Tiempo restante: {formatearTiempo(tiempoRestante)}
          </div>
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuenow={conteo.respondidas}
        aria-valuemin={0}
        aria-valuemax={preguntas.length}
        className="h-2 w-full overflow-hidden rounded-full bg-lila-100"
      >
        <div
          className="h-full bg-lila-600 transition-all"
          style={{ width: `${(conteo.respondidas / preguntas.length) * 100}%` }}
        />
      </div>

      {(mostrarCalculadora || mostrarFormulas) && (
        <div className="fixed bottom-4 right-4 z-20 flex flex-col gap-3">
          {mostrarCalculadora && <CalculadoraSimple onCerrar={() => setMostrarCalculadora(false)} />}
          {mostrarFormulas && <HojaFormulas onCerrar={() => setMostrarFormulas(false)} />}
        </div>
      )}

      <div className="flex flex-col gap-6 rounded-2xl border border-borde bg-blanco p-6 shadow-sm lg:flex-row">
        <div className="flex-1">
          <p className="text-lg text-texto">
            <TextoConFormulas texto={preguntaActual.enunciado} />
          </p>
          {preguntaActual.recurso_url && (
            <div className="mt-4 max-w-full overflow-x-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preguntaActual.recurso_url}
                alt={preguntaActual.recurso_alt ?? "Recurso visual de la pregunta"}
                className="max-h-80 rounded-lg border border-borde"
              />
            </div>
          )}

          <fieldset className="mt-6 flex flex-col gap-3">
            <legend className="sr-only">Opciones de respuesta</legend>
            {preguntaActual.opciones.map((opcion) => {
              const seleccionada = respuestaActual?.opcion_seleccionada === opcion.letra;
              return (
                <label
                  key={opcion.letra}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition-colors ${
                    seleccionada ? "border-lila-600 bg-lila-100" : "border-borde hover:border-lila-600/50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`pregunta-${preguntaActual.pregunta_id}`}
                    checked={seleccionada}
                    onChange={() => guardarRespuesta(preguntaActual.pregunta_id, { opcion_seleccionada: opcion.letra })}
                    className="mt-1"
                  />
                  <span className="flex-1">
                    <span className="font-semibold text-lila-800">{opcion.letra})</span>{" "}
                    <TextoConFormulas texto={opcion.texto} />
                  </span>
                  {seleccionada && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-lila-700">
                      <Check size={16} aria-hidden /> Elegida
                    </span>
                  )}
                </label>
              );
            })}
          </fieldset>

          <button
            type="button"
            onClick={() =>
              guardarRespuesta(preguntaActual.pregunta_id, {
                marcada_para_revisar: !respuestaActual?.marcada_para_revisar,
              })
            }
            aria-pressed={respuestaActual?.marcada_para_revisar ?? false}
            className={`mt-4 flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium ${
              respuestaActual?.marcada_para_revisar
                ? "border-amarillo-600 bg-amarillo-500 text-white"
                : "border-borde text-texto-secundario hover:bg-amarillo-100"
            }`}
          >
            <Flag size={16} aria-hidden />
            {respuestaActual?.marcada_para_revisar ? "Marcada para revisar" : "Marcar para revisar"}
          </button>
        </div>

        <nav aria-label="Navegación entre preguntas" className="w-full shrink-0 lg:w-56">
          <p className="mb-2 text-xs font-medium text-texto-secundario">Preguntas</p>
          <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-5">
            {preguntas.map((p, i) => {
              const r = respuestas[p.pregunta_id];
              const respondida = Boolean(r?.opcion_seleccionada);
              const marcada = Boolean(r?.marcada_para_revisar);
              const estadoTexto = marcada ? "marcada para revisar" : respondida ? "respondida" : "sin responder";
              return (
                <button
                  key={p.pregunta_id}
                  type="button"
                  onClick={() => setIndice(i)}
                  aria-label={`Pregunta ${i + 1}, ${estadoTexto}`}
                  aria-current={i === indice}
                  className={`relative flex items-center justify-center gap-0.5 rounded-md border py-1.5 text-xs font-semibold ${
                    i === indice
                      ? "border-lila-600 ring-2 ring-lila-600"
                      : marcada
                        ? "border-amarillo-600 bg-amarillo-100 text-lila-800"
                        : respondida
                          ? "border-lila-600 bg-lila-100 text-lila-700"
                          : "border-borde text-texto-secundario"
                  }`}
                >
                  {i + 1}
                  {respondida && <Check size={12} aria-hidden />}
                  {marcada && <Flag size={10} aria-hidden className="absolute -right-1 -top-1 text-amarillo-600" />}
                </button>
              );
            })}
          </div>
          <ul className="mt-3 flex flex-col gap-1 text-xs text-texto-secundario">
            <li className="flex items-center gap-1.5">
              <Check size={12} aria-hidden className="text-lila-700" /> Azul: respondida
            </li>
            <li className="flex items-center gap-1.5">
              <Flag size={12} aria-hidden className="text-amarillo-600" /> Rojo: marcada para revisar
            </li>
            <li>Sin marca: sin responder</li>
          </ul>
        </nav>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-borde bg-blanco px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndice((i) => Math.max(0, i - 1))}
            disabled={indice === 0}
            className="btn-neutro disabled:opacity-40"
          >
            ← Anterior
          </button>
          {indice < preguntas.length - 1 ? (
            <button type="button" onClick={() => setIndice((i) => Math.min(preguntas.length - 1, i + 1))} className="btn-primario">
              Siguiente →
            </button>
          ) : (
            <button type="button" onClick={() => setMostrarConfirmacion(true)} className="btn-primario">
              Finalizar evaluación
            </button>
          )}
        </div>
      </div>

      {mostrarConfirmacion && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-confirmacion" className="w-full max-w-md rounded-2xl bg-blanco p-6">
            <h2 id="titulo-confirmacion" className="text-lg font-bold text-lila-800">
              ¿Entregar la evaluación?
            </h2>
            <ul className="mt-4 flex flex-col gap-1.5 text-sm text-texto">
              <li className="flex items-center gap-1.5">
                <Check size={16} aria-hidden className="text-lila-700" /> Respondidas: {conteo.respondidas}
              </li>
              <li>Sin responder: {conteo.sinResponder}</li>
              <li className="flex items-center gap-1.5">
                <Flag size={16} aria-hidden className="text-lila-800" /> Marcadas para revisar: {conteo.marcadas}
              </li>
            </ul>
            <p className="mt-3 text-sm text-texto-secundario">Una vez entregada, no vas a poder modificar tus respuestas.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setMostrarConfirmacion(false)} className="btn-neutro">
                Seguir respondiendo
              </button>
              <button type="button" disabled={entregando} aria-busy={entregando} onClick={entregar} className="btn-primario">
                {entregando ? "Entregando..." : "Entregar evaluación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
