import { notFound } from "next/navigation";
import { exigirPerfil } from "@/lib/auth";
import { obtenerPerfilCompleto } from "@/lib/db/usuarios";
import { FormularioEditarUsuario } from "./FormularioEditarUsuario";

export default async function PaginaEditarUsuario({ params }: { params: Promise<{ id: string }> }) {
  const perfilActual = await exigirPerfil(["admin"]);
  const { id } = await params;

  const perfil = await obtenerPerfilCompleto(perfilActual.id, id);
  if (!perfil) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-lila-800">
        Editar {perfil.nombre} {perfil.apellido}
      </h1>
      <div className="tarjeta max-w-lg">
        <FormularioEditarUsuario perfil={perfil} />
      </div>
    </div>
  );
}
