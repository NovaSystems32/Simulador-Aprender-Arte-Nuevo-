import { exigirPerfil } from "@/lib/auth";
import { listarEvaluacionesResumen } from "@/lib/db/evaluaciones";
import { listarPerfilesPorRol } from "@/lib/db/usuarios";
import {
  SeccionEliminarEvaluacion,
  SeccionLimpiarHistorialEstudiante,
  SeccionLimpiarHistorialEvaluacion,
  SeccionLimpiezaGeneral,
} from "./GestionDatosClient";

export default async function PaginaGestionDatos() {
  const perfil = await exigirPerfil(["admin"]);

  const [estudiantes, evaluaciones] = await Promise.all([
    listarPerfilesPorRol(perfil.id, "estudiante"),
    listarEvaluacionesResumen(perfil.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-lila-800">Gestión de datos</h1>
        <p className="text-sm text-texto-secundario">
          Herramientas para limpiar historiales de evaluación y resultados. Todas las acciones quedan registradas en
          el registro de auditoría y requieren confirmación reforzada.
        </p>
      </div>

      <SeccionLimpiarHistorialEstudiante estudiantes={estudiantes} />
      <SeccionLimpiarHistorialEvaluacion evaluaciones={evaluaciones} />
      <SeccionEliminarEvaluacion evaluaciones={evaluaciones} />
      <SeccionLimpiezaGeneral />
    </div>
  );
}
