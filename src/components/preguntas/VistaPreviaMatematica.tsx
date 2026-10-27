"use client";

import "katex/dist/katex.min.css";
import { InlineMath, BlockMath } from "react-katex";

// react-katex (InlineMath/BlockMath) no expone un prop para pasarle opciones
// de KaTeX como trust/strict: solo reenvía { displayMode, errorColor,
// throwOnError } a katex.renderToString. No hace falta configurarlo a mano:
// katex ya trae trust:false y strict:"warn" como default de fábrica, que es
// exactamente el modo seguro (sin \href/\includegraphics con URLs externas).

function ErrorFormula({ texto }: { texto: string }) {
  return (
    <span className="rounded bg-error-50 px-1 py-0.5 font-mono text-xs text-error" title="Expresión matemática inválida">
      {texto}
    </span>
  );
}

/**
 * Un $...$ solo se trata como fórmula si el contenido no arranca ni termina
 * con espacio. Es la misma convención que usan Pandoc y remark-math, y acá
 * además evita un choque real: preguntas del banco que citan dos precios en
 * pesos en el mismo campo (ej. "cuestan $9000; ... cuestan $9500") tienen dos
 * signos $ sueltos que, sin esta guarda, el regex empareja como si fueran los
 * delimitadores de una sola fórmula y KaTeX los renderiza como un galimatías.
 * Un "$x^2$" nunca tiene espacio pegado a los delimitadores, así que la
 * fórmula real no se ve afectada.
 */
function esFormulaValida(contenido: string): boolean {
  return contenido.length > 0 && !/^\s|\s$/.test(contenido);
}

export interface SegmentoTexto {
  tipo: "texto";
  contenido: string;
  inicio: number;
  fin: number;
}

export interface SegmentoFormula {
  tipo: "formula";
  /** TeX sin delimitadores. */
  tex: string;
  modo: "linea" | "bloque";
  /** Rango en el string ORIGINAL, delimitadores incluidos. */
  inicio: number;
  fin: number;
}

export type Segmento = SegmentoTexto | SegmentoFormula;

/**
 * Parte un texto en segmentos de texto plano y fórmulas ($...$ o $$...$$),
 * conservando el rango [inicio, fin) de cada uno en el string original. La
 * usan tanto TextoConFormulas (renderizado de solo lectura) como el preview
 * editable de CampoTextoConEcuaciones (que necesita saber en qué posición
 * exacta está cada fórmula para poder editarla con un doble clic).
 */
export function segmentarFormulas(texto: string): Segmento[] {
  const segmentos: Segmento[] = [];
  // $$...$$ (bloque) y $...$ (en línea), en el orden en que aparecen.
  const regex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
  let cursor = 0;
  let coincidencia: RegExpExecArray | null;

  while ((coincidencia = regex.exec(texto)) !== null) {
    const [completo, contenidoBloque, contenidoLinea] = coincidencia;
    const inicio = coincidencia.index;
    const fin = inicio + completo.length;
    const esBloque = contenidoBloque !== undefined;
    const contenido = esBloque ? contenidoBloque : contenidoLinea;

    if (!esFormulaValida(contenido)) continue;

    if (inicio > cursor) {
      segmentos.push({ tipo: "texto", contenido: texto.slice(cursor, inicio), inicio: cursor, fin: inicio });
    }
    segmentos.push({ tipo: "formula", tex: contenido, modo: esBloque ? "bloque" : "linea", inicio, fin });
    cursor = fin;
  }

  if (cursor < texto.length) {
    segmentos.push({ tipo: "texto", contenido: texto.slice(cursor), inicio: cursor, fin: texto.length });
  }

  return segmentos;
}

/**
 * Muestra texto con fórmulas en LaTeX delimitadas por $$...$$ (ecuación
 * centrada/bloque) o $...$ (en línea). El resto del texto se muestra tal
 * cual. Una fórmula inválida se muestra resaltada en vez de romper la
 * pantalla completa (nunca debería tirar abajo la pregunta, la evaluación
 * o los resultados por un typo de TeX).
 */
export function TextoConFormulas({ texto, className }: { texto: string; className?: string }) {
  if (!texto) return null;
  const segmentos = segmentarFormulas(texto);

  return (
    <span className={className}>
      {segmentos.map((s, indice) => {
        if (s.tipo === "texto") return <span key={indice}>{s.contenido}</span>;
        const original = texto.slice(s.inicio, s.fin);
        return s.modo === "bloque" ? (
          <BlockMath key={indice} math={s.tex} renderError={() => <ErrorFormula texto={original} />} />
        ) : (
          <InlineMath key={indice} math={s.tex} renderError={() => <ErrorFormula texto={original} />} />
        );
      })}
    </span>
  );
}
