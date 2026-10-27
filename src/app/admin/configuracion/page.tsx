import { exigirPerfil } from "@/lib/auth";
import { obtenerConfiguracion, obtenerInstitucion } from "@/lib/db/configuracion";
import { obtenerInstitucionDePerfil } from "@/lib/db/usuarios";
import { FormularioConfiguracion } from "./FormularioConfiguracion";

export default async function PaginaConfiguracion() {
  const perfil = await exigirPerfil(["admin"]);

  const institucionId = await obtenerInstitucionDePerfil(perfil.id, perfil.id);

  const institucion = institucionId ? await obtenerInstitucion(perfil.id, institucionId) : null;
  const configuracion = institucionId
    ? await obtenerConfiguracion(perfil.id, institucionId, "puntaje_aprobacion_default")
    : null;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-bold text-lila-800">Configuración general</h1>
      <FormularioConfiguracion
        nombreInstitucion={institucion?.nombre ?? ""}
        puntajeAprobacionDefault={(configuracion?.valor as { valor?: number } | null)?.valor ?? 60}
      />
    </div>
  );
}
