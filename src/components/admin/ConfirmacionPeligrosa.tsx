"use client";

import { useState, useTransition, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export interface ItemResumenPeligroso {
  etiqueta: string;
  valor: string | number;
}

/**
 * Diálogo de confirmación reforzada para acciones administrativas destructivas
 * (eliminar definitivamente, limpiar historial, etc). Requiere tildar un
 * checkbox y escribir una frase exacta antes de habilitar el botón de
 * confirmación. El resumen de registros afectados se carga al abrir el diálogo
 * (para no hacerle esa consulta al servidor en cada render de la tabla).
 */
export function ConfirmacionPeligrosa({
  triggerLabel,
  triggerClassName = "text-xs font-medium text-error hover:underline disabled:opacity-50",
  deshabilitadoTrigger,
  titulo,
  descripcion,
  cargarResumen,
  advertenciaExtra,
  textoConfirmacion,
  labelConfirmar,
  onConfirmar,
}: {
  triggerLabel: string;
  triggerClassName?: string;
  deshabilitadoTrigger?: boolean;
  titulo: string;
  descripcion: ReactNode;
  /** Puede devolver solo los ítems, o también un `bloqueo`: motivo por el que la acción no se puede confirmar. */
  cargarResumen?: () => Promise<ItemResumenPeligroso[] | { items: ItemResumenPeligroso[]; bloqueo?: string }>;
  advertenciaExtra?: string;
  textoConfirmacion: string;
  labelConfirmar: string;
  onConfirmar: () => Promise<{ ok: boolean; mensaje: string }>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [resumen, setResumen] = useState<ItemResumenPeligroso[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [checkbox, setCheckbox] = useState(false);
  const [texto, setTexto] = useState("");
  const [pendiente, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function abrir() {
    setAbierto(true);
    setError(null);
    setErrorCarga(null);
    if (cargarResumen) {
      setCargando(true);
      try {
        const r = await cargarResumen();
        if (Array.isArray(r)) {
          setResumen(r);
        } else {
          setResumen(r.items);
          if (r.bloqueo) setErrorCarga(r.bloqueo);
        }
      } catch (e) {
        setErrorCarga(e instanceof Error ? e.message : "No se pudo cargar la información.");
      } finally {
        setCargando(false);
      }
    }
  }

  function cerrar() {
    setAbierto(false);
    setResumen(null);
    setCheckbox(false);
    setTexto("");
    setError(null);
  }

  const puedeConfirmar = checkbox && texto.trim() === textoConfirmacion && !cargando && !errorCarga;

  return (
    <>
      <button type="button" disabled={deshabilitadoTrigger} onClick={abrir} className={triggerClassName}>
        {triggerLabel}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-confirmacion-peligrosa"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-borde bg-blanco p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0 text-advertencia" size={22} aria-hidden />
              <div>
                <h2 id="titulo-confirmacion-peligrosa" className="text-lg font-bold text-texto">
                  {titulo}
                </h2>
                <p className="mt-1 text-sm text-texto-secundario">{descripcion}</p>
              </div>
            </div>

            {cargando && <p className="mt-4 text-sm text-texto-secundario">Cargando datos afectados…</p>}
            {errorCarga && <p className="alerta-error mt-4">{errorCarga}</p>}

            {resumen && resumen.length > 0 && (
              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-lila-50 p-3 text-sm">
                {resumen.map((r) => (
                  <div key={r.etiqueta}>
                    <dt className="text-xs text-texto-secundario">{r.etiqueta}</dt>
                    <dd className="font-semibold text-texto">{r.valor}</dd>
                  </div>
                ))}
              </dl>
            )}

            {advertenciaExtra && <p className="alerta-advertencia mt-4">{advertenciaExtra}</p>}

            <p className="mt-4 text-sm font-semibold text-error">Esta acción no se puede deshacer.</p>

            <label className="mt-3 flex items-start gap-2 text-sm text-texto">
              <input
                type="checkbox"
                checked={checkbox}
                onChange={(e) => setCheckbox(e.target.checked)}
                className="mt-0.5"
              />
              Entiendo las consecuencias y confirmo esta acción.
            </label>

            <label className="mt-3 block text-sm text-texto">
              Escribí <span className="font-mono font-semibold">{textoConfirmacion}</span> para confirmar
              <input
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="campo-texto mt-1"
                autoComplete="off"
                spellCheck={false}
              />
            </label>

            {error && <p className="alerta-error mt-3">{error}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={cerrar}
                disabled={pendiente}
                className="btn-neutro"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!puedeConfirmar || pendiente}
                aria-busy={pendiente}
                onClick={() =>
                  iniciarTransicion(async () => {
                    const r = await onConfirmar();
                    if (r.ok) {
                      cerrar();
                    } else {
                      setError(r.mensaje);
                    }
                  })
                }
                className="btn-peligroso"
              >
                {pendiente ? "Procesando…" : labelConfirmar}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
