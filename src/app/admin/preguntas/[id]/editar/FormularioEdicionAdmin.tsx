"use client";

import { useRouter } from "next/navigation";
import { FormularioPregunta } from "@/components/preguntas/FormularioPregunta";
import type { Pregunta } from "@/lib/types";
import { actualizarPregunta, type EstadoFormularioPregunta } from "@/app/docente/preguntas/actions";

export function FormularioEdicionAdmin({ pregunta }: { pregunta: Pregunta }) {
  const router = useRouter();

  async function accion(estado: EstadoFormularioPregunta, formData: FormData) {
    return actualizarPregunta(pregunta.id, estado, formData);
  }

  return (
    <FormularioPregunta accion={accion} pregunta={pregunta} onExito={(e) => router.push(`/admin/preguntas?guardada=${encodeURIComponent(e.codigo ?? "")}&accion=actualizada`)} />
  );
}
