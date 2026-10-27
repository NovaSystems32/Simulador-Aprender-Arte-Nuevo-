"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CAPACIDADES, DIFICULTADES, EJES, type Pregunta } from "@/lib/types";
import {
  cambiarEstadoPregunta,
  duplicarPregunta,
  eliminarPregunta,
  obtenerResumenEliminacionPregunta,
} from "@/app/docente/preguntas/actions";
import { ConfirmacionPeligrosa } from "@/components/admin/ConfirmacionPeligrosa";
import { TextoConFormulas } from "./VistaPreviaMatematica";

const ETIQUETA_EJE = Object.fromEntries(EJES.map((e) => [e.value, e.label]));
const ETIQUETA_CAPACIDAD = Object.fromEntries(CAPACIDADES.map((c) => [c.value, c.label]));
const ETIQUETA_DIFICULTAD = Object.fromEntries(DIFICULTADES.map((d) => [d.value, d.label]));

const ESTILO_ESTADO: Record<string, string> = {
  borrador: "bg-lila-100 text-lila-700",
  activa: "bg-exito-50 text-exito",
  archivada: "bg-advertencia-50 text-advertencia",
};

const ETIQUETA_ESTADO: Record<string, string> = {
  borrador: "Borrador",
  activa: "Activa",
  archivada: "Archivada",
};

function Acciones({ pregunta, basePath, esAdmin, pendiente, iniciarTransicion }: {
  pregunta: Pregunta;
  basePath: string;
  esAdmin: boolean;
  pendiente: boolean;
  iniciarTransicion: (fn: () => void | Promise<void>) => void;
}) {
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  function ejecutar(accion: () => Promise<{ ok: boolean; mensaje: string }>) {
    setMensaje(null);
    iniciarTransicion(async () => {
      try {
        const r = await accion();
        setMensaje({ tipo: r.ok ? "ok" : "error", texto: r.mensaje });
      } catch {
        setMensaje({ tipo: "error", texto: "No se pudo completar la acción. Probá de nuevo en unos minutos." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-3 text-xs">
        {esAdmin && (
          <Link href={`${basePath}/${pregunta.id}`} className="font-medium text-lila-600 hover:underline">
            Ver
          </Link>
        )}
        <Link href={`${basePath}/${pregunta.id}/editar`} className="font-medium text-lila-600 hover:underline">
          Editar
        </Link>
        <button
          type="button"
          disabled={pendiente}
          onClick={() => ejecutar(() => duplicarPregunta(pregunta.id))}
          className="font-medium text-lila-600 hover:underline disabled:opacity-50"
        >
          Duplicar
        </button>
        {pregunta.estado !== "archivada" ? (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => ejecutar(() => cambiarEstadoPregunta(pregunta.id, "archivada"))}
            className="font-medium text-advertencia hover:underline disabled:opacity-50"
          >
            Archivar
          </button>
        ) : (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => ejecutar(() => cambiarEstadoPregunta(pregunta.id, "borrador"))}
            className="font-medium text-lila-600 hover:underline disabled:opacity-50"
          >
            Restaurar
          </button>
        )}
        {/* La eliminación permanente queda separada de las acciones habituales. La pueden iniciar
            docentes y administradores (validado en el servidor); a un docente se le bloquea si la
            pregunta ya se usó en evaluaciones o intentos. */}
        {(
          <ConfirmacionPeligrosa
            triggerLabel="Eliminar definitivamente"
            titulo={`Eliminar la pregunta ${pregunta.codigo}`}
            descripcion={pregunta.enunciado.length > 140 ? `${pregunta.enunciado.slice(0, 140)}…` : pregunta.enunciado}
            cargarResumen={async () => {
              const r = await obtenerResumenEliminacionPregunta(pregunta.id);
              return {
                items: [
                  { etiqueta: "Evaluaciones que la usan", valor: r.evaluacionesQueLaUsan },
                  { etiqueta: "Intentos que la usan", valor: r.intentosQueLaUsan },
                  { etiqueta: "Respuestas vinculadas", valor: r.respuestasVinculadas },
                ],
                bloqueo: r.bloqueo,
              };
            }}
            advertenciaExtra="Si esta pregunta ya fue usada en evaluaciones rendidas, eliminarla también borra esos intentos/respuestas afectados. Si preferís conservar el historial, usá 'Archivar' en su lugar."
            textoConfirmacion="ELIMINAR PREGUNTA"
            labelConfirmar="Eliminar definitivamente"
            onConfirmar={async () => {
              const r = await eliminarPregunta(pregunta.id, "ELIMINAR PREGUNTA");
              setMensaje({ tipo: r.ok ? "ok" : "error", texto: r.mensaje });
              return r;
            }}
          />
        )}
      </div>
      {mensaje && <p className={mensaje.tipo === "ok" ? "alerta-exito" : "alerta-error"}>{mensaje.texto}</p>}
    </div>
  );
}

export function TablaPreguntas({
  preguntas,
  basePath,
  esAdmin = false,
}: {
  preguntas: Pregunta[];
  basePath: string;
  esAdmin?: boolean;
}) {
  const [pendiente, iniciarTransicion] = useTransition();

  if (preguntas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-borde p-8 text-center text-texto-secundario">
        No hay preguntas que coincidan con los filtros aplicados.
      </p>
    );
  }

  return (
    <>
      {/* Tabla: desde sm en adelante */}
      <div className="hidden overflow-x-auto rounded-xl border border-borde bg-blanco sm:block">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="border-b border-borde bg-lila-50 text-xs uppercase tracking-wide text-texto-secundario">
            <tr>
              <th scope="col" className="px-4 py-3">Código</th>
              <th scope="col" className="px-4 py-3">Enunciado</th>
              <th scope="col" className="px-4 py-3">Eje / Contenido</th>
              <th scope="col" className="px-4 py-3">Capacidad</th>
              <th scope="col" className="px-4 py-3">Dificultad</th>
              <th scope="col" className="px-4 py-3">Estado</th>
              <th scope="col" className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {preguntas.map((pregunta) => (
              <tr key={pregunta.id} className="border-b border-borde last:border-0 hover:bg-lila-50/60">
                <td className="px-4 py-3 font-mono text-xs text-texto-secundario">{pregunta.codigo}</td>
                <td className="max-w-xs px-4 py-3">
                  <p className="line-clamp-2 text-texto">
                    <TextoConFormulas texto={pregunta.enunciado} />
                  </p>
                </td>
                <td className="px-4 py-3 text-texto-secundario">
                  <p>{ETIQUETA_EJE[pregunta.eje]}</p>
                  <p className="text-xs text-texto-secundario/70">{pregunta.contenido}</p>
                </td>
                <td className="px-4 py-3 text-texto-secundario">{ETIQUETA_CAPACIDAD[pregunta.capacidad]}</td>
                <td className="px-4 py-3 text-texto-secundario">{ETIQUETA_DIFICULTAD[pregunta.dificultad]}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ESTILO_ESTADO[pregunta.estado]}`}>
                    {ETIQUETA_ESTADO[pregunta.estado]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Acciones pregunta={pregunta} basePath={basePath} esAdmin={esAdmin} pendiente={pendiente} iniciarTransicion={iniciarTransicion} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas: solo mobile */}
      <div className="flex flex-col gap-3 sm:hidden">
        {preguntas.map((pregunta) => (
          <div key={pregunta.id} className="tarjeta">
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-xs text-texto-secundario">{pregunta.codigo}</span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${ESTILO_ESTADO[pregunta.estado]}`}>
                {ETIQUETA_ESTADO[pregunta.estado]}
              </span>
            </div>
            <p className="mt-2 text-sm text-texto">
              <TextoConFormulas texto={pregunta.enunciado} />
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-texto-secundario">
              <div>
                <dt className="text-texto-secundario/70">Eje</dt>
                <dd>{ETIQUETA_EJE[pregunta.eje]}</dd>
              </div>
              <div>
                <dt className="text-texto-secundario/70">Capacidad</dt>
                <dd>{ETIQUETA_CAPACIDAD[pregunta.capacidad]}</dd>
              </div>
              <div>
                <dt className="text-texto-secundario/70">Contenido</dt>
                <dd>{pregunta.contenido}</dd>
              </div>
              <div>
                <dt className="text-texto-secundario/70">Dificultad</dt>
                <dd>{ETIQUETA_DIFICULTAD[pregunta.dificultad]}</dd>
              </div>
            </dl>
            <div className="mt-3 border-t border-borde pt-3">
              <Acciones pregunta={pregunta} basePath={basePath} esAdmin={esAdmin} pendiente={pendiente} iniciarTransicion={iniciarTransicion} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
