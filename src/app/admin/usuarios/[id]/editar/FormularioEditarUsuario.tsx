"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Perfil } from "@/lib/types";
import { actualizarDatosUsuario } from "../../actions";

export function FormularioEditarUsuario({ perfil }: { perfil: Perfil }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(perfil.nombre);
  const [apellido, setApellido] = useState(perfil.apellido);
  const [pendiente, iniciarTransicion] = useTransition();
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    iniciarTransicion(async () => {
      const r = await actualizarDatosUsuario(perfil.id, { nombre, apellido });
      setMensaje({ tipo: r.ok ? "ok" : "error", texto: r.mensaje });
      if (r.ok) router.push(`/admin/usuarios/${perfil.id}`);
    });
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <div>
        <p className="text-xs text-texto-secundario">Correo (no editable)</p>
        <p className="text-texto">{perfil.email}</p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="nombre" className="text-xs font-medium text-texto-secundario">
          Nombre
        </label>
        <input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="campo-texto" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="apellido" className="text-xs font-medium text-texto-secundario">
          Apellido
        </label>
        <input id="apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} required className="campo-texto" />
      </div>
      {mensaje && <p className={mensaje.tipo === "ok" ? "alerta-exito" : "alerta-error"}>{mensaje.texto}</p>}
      <button type="submit" disabled={pendiente} className="btn-primario w-fit">
        {pendiente ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
