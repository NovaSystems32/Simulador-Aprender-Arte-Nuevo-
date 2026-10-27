import { NOMBRE_INSTITUCION } from "@/lib/marca";

export function PiePagina() {
  return (
    <footer className="no-imprimir mt-auto border-t border-borde bg-blanco px-4 py-6 text-center text-sm text-texto-secundario">
      <p className="mx-auto max-w-3xl">
        Simulador educativo independiente del Instituto {NOMBRE_INSTITUCION}. No pertenece ni
        representa a organismos gubernamentales.
      </p>
    </footer>
  );
}
