"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BotonComenzar({ evaluacionId }: { evaluacionId: string }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function comenzar() {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/intentos/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ evaluacionId }),
      });
      const datos = await res.json();
      if (!res.ok) {
        setError(datos.error ?? "No se pudo iniciar la evaluación.");
        setCargando(false);
        return;
      }
      router.push(`/estudiante/intento/${datos.intentoId}`);
    } catch {
      setError("No se pudo conectar con el servidor. Intentá de nuevo.");
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p role="alert" className="rounded-md bg-error-50 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={comenzar}
        disabled={cargando}
        className="self-start rounded-lg bg-lila-600 px-6 py-3 text-base font-semibold text-white hover:bg-lila-800 disabled:opacity-60"
      >
        {cargando ? "Preparando evaluación..." : "Comenzar evaluación"}
      </button>
    </div>
  );
}
