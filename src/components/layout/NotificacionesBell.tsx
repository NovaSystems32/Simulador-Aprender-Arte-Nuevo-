"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { Notificacion } from "@/app/api/notificaciones/route";

const CLAVE_ULTIMA_VISTA = "arte-nuevo:ultima-notificacion-vista";

export function NotificacionesBell() {
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[] | null>(null);
  const [hayNuevas, setHayNuevas] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notificaciones")
      .then((r) => r.json())
      .then((json: { notificaciones: Notificacion[] }) => {
        setNotificaciones(json.notificaciones);
        const ultimaVista = localStorage.getItem(CLAVE_ULTIMA_VISTA);
        if (json.notificaciones[0] && json.notificaciones[0].id !== ultimaVista) {
          setHayNuevas(true);
        }
      })
      .catch(() => setNotificaciones([]));
  }, []);

  useEffect(() => {
    function alClickearFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", alClickearFuera);
    return () => document.removeEventListener("mousedown", alClickearFuera);
  }, []);

  function alAbrir() {
    setAbierto((v) => !v);
    if (notificaciones?.[0]) {
      localStorage.setItem(CLAVE_ULTIMA_VISTA, notificaciones[0].id);
      setHayNuevas(false);
    }
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={alAbrir}
        aria-label={hayNuevas ? "Notificaciones, hay novedades" : "Notificaciones"}
        aria-expanded={abierto}
        className="relative rounded-full p-2 text-texto-secundario hover:bg-lila-50 hover:text-lila-700"
      >
        <Bell size={20} aria-hidden />
        {hayNuevas && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amarillo-600 ring-2 ring-white"
          />
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-borde bg-blanco p-2 shadow-lg">
          <p className="px-2 py-1 text-xs font-semibold uppercase text-texto-secundario">Notificaciones</p>
          {notificaciones === null ? (
            <p className="px-2 py-3 text-sm text-texto-secundario">Cargando...</p>
          ) : notificaciones.length === 0 ? (
            <p className="px-2 py-3 text-sm text-texto-secundario">Sin novedades por el momento.</p>
          ) : (
            <ul className="flex flex-col">
              {notificaciones.map((n) => (
                <li key={n.id}>
                  <Link
                    href={n.href}
                    onClick={() => setAbierto(false)}
                    className="block rounded-lg px-2 py-2 text-sm hover:bg-lila-50"
                  >
                    <p className="font-medium text-texto">{n.titulo}</p>
                    <p className="text-xs text-texto-secundario">{n.descripcion}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
