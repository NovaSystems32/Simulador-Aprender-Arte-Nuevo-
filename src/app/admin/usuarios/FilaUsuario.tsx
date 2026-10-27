"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Perfil, RolUsuario } from "@/lib/types";
import { ConfirmacionPeligrosa } from "@/components/admin/ConfirmacionPeligrosa";
import { alternarActivo, cambiarRol, eliminarEstudianteDefinitivo, obtenerResumenEliminacionEstudiante } from "./actions";

type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

function useAccionesUsuario(perfil: Perfil) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [mensaje, setMensaje] = useState<Mensaje>(null);

  function toggleActivo() {
    iniciarTransicion(async () => {
      const r = await alternarActivo(perfil.id, !perfil.activo);
      setMensaje({ tipo: r.ok ? "ok" : "error", texto: r.mensaje });
    });
  }

  return { pendiente, mensaje, setMensaje, toggleActivo, iniciarTransicion };
}

function AccionesEstudiante({ perfil, mensajeSetter }: { perfil: Perfil; mensajeSetter: (m: Mensaje) => void }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <Link href={`/admin/usuarios/${perfil.id}`} className="font-medium text-lila-600 hover:underline">
        Ver
      </Link>
      <Link href={`/admin/usuarios/${perfil.id}/editar`} className="font-medium text-lila-600 hover:underline">
        Editar
      </Link>
      <ConfirmacionPeligrosa
        triggerLabel="Eliminar definitivamente"
        titulo={`Eliminar a ${perfil.nombre} ${perfil.apellido}`}
        descripcion="Se eliminarán su perfil, inscripciones, intentos, respuestas, resultados y notificaciones. No se puede deshacer."
        cargarResumen={async () => {
          const resumen = await obtenerResumenEliminacionEstudiante(perfil.id);
          return [
            { etiqueta: "Curso / división", valor: resumen.cursoDivision ?? "sin curso asignado" },
            { etiqueta: "Evaluaciones realizadas", valor: resumen.evaluacionesRealizadas },
            { etiqueta: "Resultados asociados", valor: resumen.resultadosAsociados },
          ];
        }}
        textoConfirmacion="ELIMINAR"
        labelConfirmar="Eliminar definitivamente"
        onConfirmar={async () => {
          const r = await eliminarEstudianteDefinitivo(perfil.id, "ELIMINAR");
          mensajeSetter({ tipo: r.ok ? "ok" : "error", texto: r.mensaje });
          return r;
        }}
      />
    </div>
  );
}

export function FilaUsuario({ perfil }: { perfil: Perfil }) {
  const { pendiente, mensaje, setMensaje, toggleActivo, iniciarTransicion } = useAccionesUsuario(perfil);

  return (
    <>
      <tr className="border-b border-borde last:border-0">
        <td className="px-4 py-3 text-texto">
          {perfil.nombre} {perfil.apellido}
        </td>
        <td className="px-4 py-3 text-texto-secundario">{perfil.email}</td>
        <td className="px-4 py-3">
          <select
            defaultValue={perfil.rol}
            disabled={pendiente}
            onChange={(e) => iniciarTransicion(() => cambiarRol(perfil.id, e.target.value as RolUsuario))}
            className="campo-select w-auto"
          >
            <option value="estudiante">Estudiante</option>
            <option value="docente">Docente</option>
            <option value="admin">Administrador</option>
          </select>
        </td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${perfil.activo ? "bg-exito-50 text-exito" : "bg-lila-100 text-texto-secundario"}`}>
            {perfil.activo ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={pendiente}
              onClick={toggleActivo}
              className="text-xs font-medium text-lila-600 hover:underline disabled:opacity-50"
            >
              {perfil.activo ? "Desactivar" : "Activar"}
            </button>
            {perfil.rol === "estudiante" && <AccionesEstudiante perfil={perfil} mensajeSetter={setMensaje} />}
          </div>
        </td>
      </tr>
      {mensaje && (
        <tr>
          <td colSpan={5} className="px-4 pb-2">
            <p className={mensaje.tipo === "ok" ? "alerta-exito" : "alerta-error"}>{mensaje.texto}</p>
          </td>
        </tr>
      )}
    </>
  );
}

export function TarjetaUsuario({ perfil }: { perfil: Perfil }) {
  const { pendiente, mensaje, setMensaje, toggleActivo, iniciarTransicion } = useAccionesUsuario(perfil);

  return (
    <div className="tarjeta">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-texto">
            {perfil.nombre} {perfil.apellido}
          </p>
          <p className="text-xs text-texto-secundario">{perfil.email}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${perfil.activo ? "bg-exito-50 text-exito" : "bg-lila-100 text-texto-secundario"}`}>
          {perfil.activo ? "Activo" : "Inactivo"}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-borde pt-3">
        <select
          defaultValue={perfil.rol}
          disabled={pendiente}
          onChange={(e) => iniciarTransicion(() => cambiarRol(perfil.id, e.target.value as RolUsuario))}
          className="campo-select w-auto"
        >
          <option value="estudiante">Estudiante</option>
          <option value="docente">Docente</option>
          <option value="admin">Administrador</option>
        </select>
        <button
          type="button"
          disabled={pendiente}
          onClick={toggleActivo}
          className="text-xs font-medium text-lila-600 hover:underline disabled:opacity-50"
        >
          {perfil.activo ? "Desactivar" : "Activar"}
        </button>
      </div>
      {perfil.rol === "estudiante" && (
        <div className="mt-3 border-t border-borde pt-3">
          <AccionesEstudiante perfil={perfil} mensajeSetter={setMensaje} />
        </div>
      )}
      {mensaje && <p className={`mt-3 ${mensaje.tipo === "ok" ? "alerta-exito" : "alerta-error"}`}>{mensaje.texto}</p>}
    </div>
  );
}
