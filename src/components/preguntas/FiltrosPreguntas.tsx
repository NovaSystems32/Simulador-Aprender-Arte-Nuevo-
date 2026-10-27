"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CAPACIDADES, DIFICULTADES, EJES } from "@/lib/types";

export function FiltrosPreguntas() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function actualizar(clave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("guardada");
    params.delete("accion");
    if (valor) params.set(clave, valor);
    else params.delete(clave);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <label htmlFor="q" className="text-xs font-medium text-slate-600">
          Buscar por palabra clave
        </label>
        <input
          id="q"
          type="search"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => actualizar("q", e.target.value)}
          placeholder="Ej: porcentaje, Pitágoras..."
          className="campo-texto mt-1"
        />
      </div>

      <FiltroSelect
        id="eje"
        etiqueta="Eje"
        valor={searchParams.get("eje") ?? ""}
        opciones={EJES}
        onChange={(v) => actualizar("eje", v)}
      />
      <FiltroSelect
        id="capacidad"
        etiqueta="Capacidad"
        valor={searchParams.get("capacidad") ?? ""}
        opciones={CAPACIDADES}
        onChange={(v) => actualizar("capacidad", v)}
      />
      <FiltroSelect
        id="dificultad"
        etiqueta="Dificultad"
        valor={searchParams.get("dificultad") ?? ""}
        opciones={DIFICULTADES}
        onChange={(v) => actualizar("dificultad", v)}
      />
      <FiltroSelect
        id="estado"
        etiqueta="Estado"
        valor={searchParams.get("estado") ?? ""}
        opciones={[
          { value: "borrador", label: "Borrador" },
          { value: "activa", label: "Activa" },
          { value: "archivada", label: "Archivada" },
        ]}
        onChange={(v) => actualizar("estado", v)}
      />
    </div>
  );
}

function FiltroSelect({
  id,
  etiqueta,
  valor,
  opciones,
  onChange,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  opciones: { value: string; label: string }[];
  onChange: (valor: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-slate-600">
        {etiqueta}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="campo-select mt-1"
      >
        <option value="">Todos</option>
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
