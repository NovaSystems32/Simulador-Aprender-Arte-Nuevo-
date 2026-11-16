import { notFound, redirect } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { listarCursosVisibles } from "@/lib/db/cursos";
import { obtenerEvaluacionPorId, obtenerPreguntaIdsDeEvaluacion } from "@/lib/db/evaluaciones";
import { listarPreguntas, listarPreguntasPorIds } from "@/lib/db/preguntas";
import { FormularioNuevaEvaluacion } from "../../nueva/FormularioNuevaEvaluacion";

export default async function PaginaEditarEvaluacion({ params }: { params: Promise<{ id: string }> }) {
  const perfil = await exigirPerfil(["docente", "admin"]);
  const { id } = await params;

  const ev = await obtenerEvaluacionPorId(perfil.id, id);
  if (!ev) notFound();
  // Solo se editan borradores: una vez publicada, ni su configuración ni
  // sus preguntas pueden cambiar (eso rompería lo que ya rindieron/rinden
  // los estudiantes). No hay nada que mostrar acá en ese caso.
  if (ev.estado !== "borrador") redirect(`/docente/evaluaciones/${id}`);

  const [cursos, bancoActivo] = await Promise.all([
    listarCursosVisibles(perfil.id),
    listarPreguntas(perfil.id, { estado: "activa", ordenarPor: "codigo" }),
  ]);

  let preguntas = bancoActivo;
  let preguntaIdsSeleccionadasIniciales: string[] | undefined;

  if (ev.tipo === "manual") {
    preguntaIdsSeleccionadasIniciales = await obtenerPreguntaIdsDeEvaluacion(perfil.id, id);
    const idsFueraDelBanco = preguntaIdsSeleccionadasIniciales.filter(
      (pid) => !bancoActivo.some((p) => p.id === pid)
    );
    if (idsFueraDelBanco.length > 0) {
      const extra = await listarPreguntasPorIds(perfil.id, idsFueraDelBanco);
      preguntas = [...bancoActivo, ...extra];
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-lila-800">Editar evaluación</h1>
      <FormularioNuevaEvaluacion
        cursos={cursos}
        preguntas={preguntas}
        docenteNombre={`${perfil.nombre} ${perfil.apellido}`}
        evaluacionExistente={ev}
        preguntaIdsSeleccionadasIniciales={preguntaIdsSeleccionadasIniciales}
      />
    </div>
  );
}
