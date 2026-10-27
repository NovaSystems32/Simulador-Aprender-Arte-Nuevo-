/** Utilidades mínimas para generar y parsear CSV sin depender de una librería externa. */

function escaparCampoCsv(valor: unknown): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  if (/[",\n;]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function generarCsv<T extends object>(
  filas: T[],
  columnas: { clave: keyof T; encabezado: string }[]
): string {
  const encabezado = columnas.map((c) => escaparCampoCsv(c.encabezado)).join(",");
  const lineas = filas.map((fila) => columnas.map((c) => escaparCampoCsv(fila[c.clave])).join(","));
  // BOM UTF-8 para que Excel abra tildes y ñ correctamente
  return "﻿" + [encabezado, ...lineas].join("\r\n");
}

/** Parser CSV simple (soporta comillas y campos con comas/saltos de línea escapados). */
export function parsearCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let dentroDeComillas = false;
  const contenido = texto.replace(/^﻿/, "");

  for (let i = 0; i < contenido.length; i++) {
    const char = contenido[i];
    const siguiente = contenido[i + 1];

    if (dentroDeComillas) {
      if (char === '"' && siguiente === '"') {
        campo += '"';
        i++;
      } else if (char === '"') {
        dentroDeComillas = false;
      } else {
        campo += char;
      }
      continue;
    }

    if (char === '"') {
      dentroDeComillas = true;
    } else if (char === ",") {
      fila.push(campo);
      campo = "";
    } else if (char === "\r") {
      // ignorar, se maneja con \n
    } else if (char === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += char;
    }
  }

  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  return filas.filter((f) => !(f.length === 1 && f[0] === ""));
}
