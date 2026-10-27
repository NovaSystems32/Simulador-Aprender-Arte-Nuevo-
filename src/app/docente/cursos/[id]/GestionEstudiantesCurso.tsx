"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { agregarEstudiantesAlCurso, quitarEstudiantesDelCurso } from "../actions";

export interface EstudianteFila {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

function coincide(e: EstudianteFila, termino: string) {
  const t = termino.trim().toLowerCase();
  if (!t) return true;
  return (
    e.nombre.toLowerCase().includes(t) ||
    e.apellido.toLowerCase().includes(t) ||
    e.email.toLowerCase().includes(t)
  );
}

export function GestionEstudiantesCurso({
  cursoId,
  estudiantesCurso,
  estudiantesDisponibles,
}: {
  cursoId: string;
  estudiantesCurso: EstudianteFila[];
  estudiantesDisponibles: EstudianteFila[];
}) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [mensaje, setMensaje] = useState<Mensaje>(null);

  const [busquedaActuales, setBusquedaActuales] = useState("");
  const [busquedaDisponibles, setBusquedaDisponibles] = useState("");
  const [aQuitar, setAQuitar] = useState<Set<string>>(new Set());
  const [aAgregar, setAAgregar] = useState<Set<string>>(new Set());

  const actualesFiltrados = useMemo(
    () => estudiantesCurso.filter((e) => coincide(e, busquedaActuales)),
    [estudiantesCurso, busquedaActuales]
  );
  const disponiblesFiltrados = useMemo(
    () => estudiantesDisponibles.filter((e) => coincide(e, busquedaDisponibles)),
    [estudiantesDisponibles, busquedaDisponibles]
  );

  function alternar(set: Set<string>, setSet: (s: Set<string>) => void, id: string) {
    const copia = new Set(set);
    if (copia.has(id)) copia.delete(id);
    else copia.add(id);
    setSet(copia);
  }

  function agregarSeleccionados() {
    iniciarTransicion(async () => {
      const r = await agregarEstudiantesAlCurso(cursoId, Array.from(aAgregar));
      setMensaje({ tipo: r.ok ? "ok" : "error", texto: r.mensaje });
      if (r.ok) setAAgregar(new Set());
    });
  }

  function quitarSeleccionados() {
    if (!confirm(`¿Quitar a ${aQuitar.size} estudiante(s) del curso?`)) return;
    iniciarTransicion(async () => {
      const r = await quitarEstudiantesDelCurso(cursoId, Array.from(aQuitar));
      setMensaje({ tipo: r.ok ? "ok" : "error", texto: r.mensaje });
      if (r.ok) setAQuitar(new Set());
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {mensaje && <p className={mensaje.tipo === "ok" ? "alerta-exito" : "alerta-error"}>{mensaje.texto}</p>}

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-texto">Estudiantes del curso ({estudiantesCurso.length})</h3>
          {aQuitar.size > 0 && (
            <button
              type="button"
              disabled={pendiente}
              onClick={quitarSeleccionados}
              className="text-xs font-medium text-error hover:underline disabled:opacity-50"
            >
              Quitar seleccionados ({aQuitar.size})
            </button>
          )}
        </div>
        <input
          type="search"
          placeholder="Buscar por nombre, apellido o usuario…"
          value={busquedaActuales}
          onChange={(e) => setBusquedaActuales(e.target.value)}
          className="campo-texto mb-2"
        />
        {estudiantesCurso.length === 0 ? (
          <p className="text-sm text-texto-secundario">Todavía no hay estudiantes en este curso.</p>
        ) : actualesFiltrados.length === 0 ? (
          <p className="text-sm text-texto-secundario">Ningún estudiante del curso coincide con la búsqueda.</p>
        ) : (
          <ul className="flex max-h-72 flex-col divide-y divide-borde overflow-y-auto rounded-lg border border-borde">
            {actualesFiltrados.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <label className="flex flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={aQuitar.has(e.id)}
                    onChange={() => alternar(aQuitar, setAQuitar, e.id)}
                  />
                  <span>
                    {e.nombre} {e.apellido} <span className="text-texto-secundario">({e.email})</span>
                  </span>
                </label>
                <div className="flex shrink-0 gap-3 text-xs">
                  <Link href={`/docente/estudiantes/${e.id}`} className="font-medium text-lila-600 hover:underline">
                    Ver datos y resultados
                  </Link>
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() => {
                      if (confirm(`¿Quitar a ${e.nombre} ${e.apellido} del curso?`)) {
                        iniciarTransicion(async () => {
                          const r = await quitarEstudiantesDelCurso(cursoId, [e.id]);
                          setMensaje({ tipo: r.ok ? "ok" : "error", texto: r.mensaje });
                        });
                      }
                    }}
                    className="font-medium text-error hover:underline disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-texto">Agregar estudiantes registrados</h3>
          {aAgregar.size > 0 && (
            <button
              type="button"
              disabled={pendiente}
              onClick={agregarSeleccionados}
              className="btn-primario px-3 py-1.5 text-xs"
            >
              {pendiente ? "Agregando…" : `Agregar seleccionados (${aAgregar.size})`}
            </button>
          )}
        </div>
        <input
          type="search"
          placeholder="Buscar por nombre, apellido o usuario…"
          value={busquedaDisponibles}
          onChange={(e) => setBusquedaDisponibles(e.target.value)}
          className="campo-texto mb-2"
        />
        {estudiantesDisponibles.length === 0 ? (
          <p className="text-sm text-texto-secundario">
            No hay más estudiantes registrados disponibles para agregar.
          </p>
        ) : disponiblesFiltrados.length === 0 ? (
          <p className="text-sm text-texto-secundario">Ningún estudiante disponible coincide con la búsqueda.</p>
        ) : (
          <ul className="flex max-h-72 flex-col divide-y divide-borde overflow-y-auto rounded-lg border border-borde">
            {disponiblesFiltrados.map((e) => (
              <li key={e.id} className="px-3 py-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={aAgregar.has(e.id)}
                    onChange={() => alternar(aAgregar, setAAgregar, e.id)}
                  />
                  <span>
                    {e.nombre} {e.apellido} <span className="text-texto-secundario">({e.email})</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
