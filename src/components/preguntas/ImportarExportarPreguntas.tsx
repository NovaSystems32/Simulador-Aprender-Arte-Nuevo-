"use client";

import { useRef, useState, useTransition } from "react";
import { generarCsv, parsearCsv } from "@/lib/csv";
import { importarPreguntas, type FilaImportacion, type ResultadoImportacion } from "@/app/docente/preguntas/actions";
import type { Pregunta } from "@/lib/types";

const COLUMNAS_CSV: { clave: keyof Pregunta; encabezado: string }[] = [
  { clave: "codigo", encabezado: "codigo" },
  { clave: "enunciado", encabezado: "enunciado" },
  { clave: "opcion_a", encabezado: "opcion_a" },
  { clave: "opcion_b", encabezado: "opcion_b" },
  { clave: "opcion_c", encabezado: "opcion_c" },
  { clave: "opcion_d", encabezado: "opcion_d" },
  { clave: "respuesta_correcta", encabezado: "respuesta_correcta" },
  { clave: "explicacion", encabezado: "explicacion" },
  { clave: "eje", encabezado: "eje" },
  { clave: "contenido", encabezado: "contenido" },
  { clave: "capacidad", encabezado: "capacidad" },
  { clave: "dificultad", encabezado: "dificultad" },
  { clave: "estado", encabezado: "estado" },
];

function descargarArchivo(nombre: string, contenido: string, tipo: string) {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

export function ImportarExportarPreguntas({ preguntas }: { preguntas: Pregunta[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();

  function exportarCsv() {
    const csv = generarCsv(preguntas, COLUMNAS_CSV);
    descargarArchivo("banco-preguntas.csv", csv, "text/csv;charset=utf-8");
  }

  function exportarJson() {
    descargarArchivo(
      "banco-preguntas.json",
      JSON.stringify(preguntas, null, 2),
      "application/json;charset=utf-8"
    );
  }

  async function manejarArchivo(archivo: File) {
    const texto = await archivo.text();
    let filas: FilaImportacion[] = [];

    if (archivo.name.endsWith(".json")) {
      filas = JSON.parse(texto);
    } else {
      const tabla = parsearCsv(texto);
      const [encabezados, ...datos] = tabla;
      filas = datos.map((fila) => {
        const objeto: Record<string, string> = {};
        encabezados.forEach((clave, i) => {
          objeto[clave.trim()] = fila[i] ?? "";
        });
        return objeto as unknown as FilaImportacion;
      });
    }

    iniciarTransicion(async () => {
      const res = await importarPreguntas(filas);
      setResultado(res);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-700">Importar / exportar banco de preguntas</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={exportarCsv} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          Exportar CSV
        </button>
        <button type="button" onClick={exportarJson} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          Exportar JSON
        </button>
        <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
          {pendiente ? "Importando..." : "Importar CSV/JSON"}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            disabled={pendiente}
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              if (archivo) manejarArchivo(archivo);
              if (inputRef.current) inputRef.current.value = "";
            }}
          />
        </label>
      </div>
      {resultado && (
        <div className="rounded-lg bg-slate-50 p-3 text-sm" role="status">
          <p className="font-medium text-exito">{resultado.insertadas} preguntas importadas correctamente.</p>
          {resultado.errores.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-error">
              {resultado.errores.map((e, i) => (
                <li key={i}>
                  Fila {e.fila}: {e.motivo}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="text-xs text-slate-500">
        El CSV/JSON debe tener las columnas: enunciado, opcion_a, opcion_b, opcion_c, opcion_d,
        respuesta_correcta (A-D), explicacion, eje, contenido, capacidad, dificultad. Las preguntas
        importadas se crean en estado &quot;borrador&quot; para revisión.
      </p>
    </div>
  );
}
