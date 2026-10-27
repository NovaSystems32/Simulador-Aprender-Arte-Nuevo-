"use client";

import { Printer } from "lucide-react";

export function BotonImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-neutro no-imprimir">
      <Printer size={16} aria-hidden />
      Imprimir resultados
    </button>
  );
}
