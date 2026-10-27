"use client";

import { useRouter } from "next/navigation";
import { FormularioPregunta } from "@/components/preguntas/FormularioPregunta";
import { crearPregunta } from "../actions";

export default function PaginaNuevaPregunta() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-lila-800">Nueva pregunta</h1>
      <div className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6">
        <FormularioPregunta accion={crearPregunta} onExito={(e) => router.push(`/docente/preguntas?guardada=${encodeURIComponent(e.codigo ?? "")}`)} />
      </div>
    </div>
  );
}
