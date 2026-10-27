"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Sigma, Trash2, X } from "lucide-react";
import type { MathfieldElement } from "mathlive";

const AJUSTES_SEGUROS = { trust: false, strict: "warn" as const, throwOnError: false };
const FILAS_MAX_MATRIZ = 5;
const COLUMNAS_MAX_MATRIZ = 5;
const ECUACIONES_MIN_SISTEMA = 2;
const ECUACIONES_MAX_SISTEMA = 6;

let mathliveInicializado = false;
/** Registra <math-field> y lo configura una sola vez (fuentes locales, sin sonidos, modo seguro). */
async function asegurarMathLive() {
  if (mathliveInicializado) return;
  mathliveInicializado = true;
  const { MathfieldElement } = await import("mathlive");
  // Fuentes servidas localmente (public/fonts/mathlive), sin pedirlas a un
  // CDN externo, y sin sonidos (no forman parte de lo pedido).
  MathfieldElement.fontsDirectory = "/fonts/mathlive";
  MathfieldElement.soundsDirectory = null;
}

interface Simbolo {
  etiqueta: string;
  /** LaTeX a insertar. Los \placeholder{} quedan como espacios editables navegables con Tab/flechas. Es un detalle
   * interno: el docente nunca ve este texto, solo el resultado tipografiado en el campo visual. */
  latex: string;
  descripcion?: string;
}

const SIMBOLOS: Simbolo[] = [
  { etiqueta: "+", latex: "+" },
  { etiqueta: "−", latex: "-" },
  { etiqueta: "×", latex: "\\times " },
  { etiqueta: "÷", latex: "\\div " },
  { etiqueta: "=", latex: "=" },
  { etiqueta: "≠", latex: "\\neq " },
  { etiqueta: "<", latex: "<" },
  { etiqueta: ">", latex: ">" },
  { etiqueta: "≤", latex: "\\leq " },
  { etiqueta: "≥", latex: "\\geq " },
  { etiqueta: "±", latex: "\\pm ", descripcion: "Más menos" },
  { etiqueta: "∞", latex: "\\infty ", descripcion: "Infinito" },
  { etiqueta: "≈", latex: "\\approx ", descripcion: "Aproximadamente igual" },
  { etiqueta: "%", latex: "\\%" },
  { etiqueta: "°", latex: "^{\\circ}", descripcion: "Grados" },
];

const FRACCIONES: Simbolo[] = [
  { etiqueta: "a/b", latex: "\\frac{\\placeholder{}}{\\placeholder{}}", descripcion: "Fracción" },
  {
    etiqueta: "n a/b",
    latex: "\\placeholder{}\\frac{\\placeholder{}}{\\placeholder{}}",
    descripcion: "Número mixto (entero y fracción)",
  },
];

const POTENCIAS: Simbolo[] = [
  { etiqueta: "xⁿ", latex: "^{\\placeholder{}}", descripcion: "Exponente" },
  { etiqueta: "x²", latex: "^{2}", descripcion: "Cuadrado" },
  { etiqueta: "x³", latex: "^{3}", descripcion: "Cubo" },
  { etiqueta: "xₙ", latex: "_{\\placeholder{}}", descripcion: "Subíndice" },
];

const RAICES: Simbolo[] = [
  { etiqueta: "√x", latex: "\\sqrt{\\placeholder{}}", descripcion: "Raíz cuadrada" },
  { etiqueta: "ⁿ√x", latex: "\\sqrt[\\placeholder{}]{\\placeholder{}}", descripcion: "Raíz de índice n" },
];

const PARENTESIS: Simbolo[] = [
  { etiqueta: "( )", latex: "\\left(\\placeholder{}\\right)", descripcion: "Paréntesis" },
  { etiqueta: "[ ]", latex: "\\left[\\placeholder{}\\right]", descripcion: "Corchetes" },
  { etiqueta: "{ }", latex: "\\left\\{\\placeholder{}\\right\\}", descripcion: "Llaves" },
  { etiqueta: "|x|", latex: "\\left|\\placeholder{}\\right|", descripcion: "Valor absoluto" },
];

const INTEGRALES: Simbolo[] = [
  { etiqueta: "∫", latex: "\\int \\placeholder{}\\,dx", descripcion: "Integral indefinida" },
  { etiqueta: "∫ᵃᵇ", latex: "\\int_{\\placeholder{}}^{\\placeholder{}}\\placeholder{}\\,dx", descripcion: "Integral definida" },
];

const SUMATORIAS: Simbolo[] = [
  { etiqueta: "Σ", latex: "\\sum_{\\placeholder{}}^{\\placeholder{}}\\placeholder{}", descripcion: "Sumatoria" },
  { etiqueta: "Π", latex: "\\prod_{\\placeholder{}}^{\\placeholder{}}\\placeholder{}", descripcion: "Producto" },
];

const LIMITES_Y_LOGARITMOS: Simbolo[] = [
  { etiqueta: "lim", latex: "\\lim_{\\placeholder{}\\to\\placeholder{}}\\placeholder{}", descripcion: "Límite" },
  { etiqueta: "log", latex: "\\log_{\\placeholder{}}\\placeholder{}", descripcion: "Logaritmo" },
  { etiqueta: "ln", latex: "\\ln\\placeholder{}", descripcion: "Logaritmo natural" },
];

const TRIGONOMETRIA: Simbolo[] = [
  { etiqueta: "sin", latex: "\\sin\\placeholder{}", descripcion: "Seno" },
  { etiqueta: "cos", latex: "\\cos\\placeholder{}", descripcion: "Coseno" },
  { etiqueta: "tan", latex: "\\tan\\placeholder{}", descripcion: "Tangente" },
];

const GRIEGAS: Simbolo[] = [
  { etiqueta: "α", latex: "\\alpha " },
  { etiqueta: "β", latex: "\\beta " },
  { etiqueta: "γ", latex: "\\gamma " },
  { etiqueta: "δ", latex: "\\delta " },
  { etiqueta: "ε", latex: "\\varepsilon " },
  { etiqueta: "θ", latex: "\\theta " },
  { etiqueta: "λ", latex: "\\lambda " },
  { etiqueta: "μ", latex: "\\mu " },
  { etiqueta: "π", latex: "\\pi " },
  { etiqueta: "ρ", latex: "\\rho " },
  { etiqueta: "σ", latex: "\\sigma " },
  { etiqueta: "τ", latex: "\\tau " },
  { etiqueta: "φ", latex: "\\varphi " },
  { etiqueta: "χ", latex: "\\chi " },
  { etiqueta: "ψ", latex: "\\psi " },
  { etiqueta: "ω", latex: "\\omega " },
  { etiqueta: "Γ", latex: "\\Gamma " },
  { etiqueta: "Δ", latex: "\\Delta " },
  { etiqueta: "Θ", latex: "\\Theta " },
  { etiqueta: "Λ", latex: "\\Lambda " },
  { etiqueta: "Π", latex: "\\Pi " },
  { etiqueta: "Σ", latex: "\\Sigma " },
  { etiqueta: "Φ", latex: "\\Phi " },
  { etiqueta: "Ω", latex: "\\Omega " },
];

const CONJUNTOS_Y_GEOMETRIA: Simbolo[] = [
  { etiqueta: "∈", latex: "\\in ", descripcion: "Pertenece" },
  { etiqueta: "∉", latex: "\\notin ", descripcion: "No pertenece" },
  { etiqueta: "⊂", latex: "\\subset ", descripcion: "Subconjunto" },
  { etiqueta: "⊆", latex: "\\subseteq ", descripcion: "Subconjunto o igual" },
  { etiqueta: "∪", latex: "\\cup ", descripcion: "Unión" },
  { etiqueta: "∩", latex: "\\cap ", descripcion: "Intersección" },
  { etiqueta: "∅", latex: "\\emptyset ", descripcion: "Conjunto vacío" },
  { etiqueta: "∀", latex: "\\forall ", descripcion: "Para todo" },
  { etiqueta: "∃", latex: "\\exists ", descripcion: "Existe" },
  { etiqueta: "∠", latex: "\\angle ", descripcion: "Ángulo" },
  { etiqueta: "⊥", latex: "\\perp ", descripcion: "Perpendicular" },
  { etiqueta: "∥", latex: "\\parallel ", descripcion: "Paralelo" },
  { etiqueta: "△", latex: "\\triangle ", descripcion: "Triángulo" },
  { etiqueta: "≅", latex: "\\cong ", descripcion: "Congruente" },
  { etiqueta: "∼", latex: "\\sim ", descripcion: "Semejante" },
  { etiqueta: "→", latex: "\\rightarrow ", descripcion: "Flecha derecha" },
];

/** Genera el LaTeX de una matriz de filas×columnas, todas las celdas vacías (editables). */
function latexMatriz(filas: number, columnas: number): string {
  const fila = Array.from({ length: columnas }, () => "\\placeholder{}").join(" & ");
  const cuerpo = Array.from({ length: filas }, () => fila).join("\\\\");
  return `\\begin{pmatrix}${cuerpo}\\end{pmatrix}`;
}

/** Genera el LaTeX de un sistema de n ecuaciones, todas las filas vacías (editables). */
function latexSistema(cantidad: number): string {
  const filas = Array.from({ length: cantidad }, () => "\\placeholder{}").join("\\\\");
  return `\\begin{cases}${filas}\\end{cases}`;
}

const PESTANIAS_SIMPLES = [
  { id: "simbolos", etiqueta: "Símbolos", simbolos: SIMBOLOS },
  { id: "fracciones", etiqueta: "Fracciones", simbolos: FRACCIONES },
  { id: "potencias", etiqueta: "Potencias y subíndices", simbolos: POTENCIAS },
  { id: "raices", etiqueta: "Raíces", simbolos: RAICES },
  { id: "parentesis", etiqueta: "Paréntesis", simbolos: PARENTESIS },
  { id: "integrales", etiqueta: "Integrales", simbolos: INTEGRALES },
  { id: "sumatorias", etiqueta: "Sumatorias", simbolos: SUMATORIAS },
  { id: "limites", etiqueta: "Límites y logaritmos", simbolos: LIMITES_Y_LOGARITMOS },
  { id: "trigonometria", etiqueta: "Trigonometría", simbolos: TRIGONOMETRIA },
  { id: "griegas", etiqueta: "Griegas", simbolos: GRIEGAS },
  { id: "conjuntos", etiqueta: "Conjuntos y geometría", simbolos: CONJUNTOS_Y_GEOMETRIA },
] as const;

const ID_PESTANIA_MATRICES = "matrices" as const;

type IdPestania = (typeof PESTANIAS_SIMPLES)[number]["id"] | typeof ID_PESTANIA_MATRICES;

const PESTANIAS: { id: IdPestania; etiqueta: string }[] = [
  ...PESTANIAS_SIMPLES.slice(0, 9),
  { id: ID_PESTANIA_MATRICES, etiqueta: "Matrices y sistemas" },
  ...PESTANIAS_SIMPLES.slice(9),
];

export interface ResultadoEcuacion {
  /** El texto completo con delimitadores ($...$ o $$...$$), listo para insertar en el campo de la pregunta. */
  textoConDelimitadores: string;
}

/**
 * Editor visual de ecuaciones (estilo "insertar objeto" de un procesador de
 * texto, sin mostrar código matemático en ningún momento): el docente
 * construye la fórmula sobre un campo MathLive viendo siempre el resultado
 * tipografiado —fracciones, raíces, matrices, etc. aparecen como estructuras
 * con casilleros editables navegables con Tab/flechas—. No hay ninguna vista
 * alternativa en texto/código: lo único que existe es el resultado visual.
 * El padre monta este componente solo cuando el diálogo debe estar abierto,
 * así que cada apertura es un montaje nuevo.
 */
export function EditorEcuaciones({
  texInicial = "",
  modoInicial = "linea",
  puedeEliminar = false,
  onInsertar,
  onEliminar,
  onCancelar,
}: {
  texInicial?: string;
  modoInicial?: "linea" | "bloque";
  /** true cuando se está reeditando una ecuación ya insertada en el texto (habilita "Eliminar"). */
  puedeEliminar?: boolean;
  onInsertar: (resultado: ResultadoEcuacion) => void;
  onEliminar?: () => void;
  onCancelar: () => void;
}) {
  const idTitulo = useId();
  const [tex, setTex] = useState(texInicial);
  const [modo, setModo] = useState<"linea" | "bloque">(modoInicial);
  const [pestania, setPestania] = useState<IdPestania>("simbolos");
  const [listo, setListo] = useState(false);
  const [filasMatriz, setFilasMatriz] = useState(2);
  const [columnasMatriz, setColumnasMatriz] = useState(2);
  const [filasHover, setFilasHover] = useState(0);
  const [columnasHover, setColumnasHover] = useState(0);
  const [cantidadSistema, setCantidadSistema] = useState(2);
  const refCampo = useRef<MathfieldElement | null>(null);

  // Registra <math-field> (import dinámico: es un componente pesado y solo
  // hace falta cuando se abre el editor) y configura fuentes/sonidos una vez.
  useEffect(() => {
    let cancelado = false;
    asegurarMathLive().then(() => {
      if (!cancelado) setListo(true);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  // Al quedar listo, carga el valor inicial, enfoca el campo y oculta el menú
  // propio de MathLive (incluye opciones como "Copy as LaTeX" que expondrían
  // el código; acá la ecuación se maneja siempre de forma visual).
  useEffect(() => {
    if (!listo || !refCampo.current) return;
    refCampo.current.value = tex;
    refCampo.current.menuItems = [];
    refCampo.current.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo]);

  // Escucha los cambios que el docente hace en el campo visual.
  useEffect(() => {
    const campo = refCampo.current;
    if (!campo) return;
    const alEscribir = () => setTex(campo.getValue("latex"));
    campo.addEventListener("input", alEscribir);
    return () => campo.removeEventListener("input", alEscribir);
  }, [listo]);

  const error = useMemo(() => {
    if (!tex.trim()) return null;
    if (/\\placeholder\s*\{\s*\}/.test(tex)) {
      return "Todavía hay espacios vacíos. Completalos o borralos antes de insertar.";
    }
    try {
      katex.renderToString(tex, { ...AJUSTES_SEGUROS, throwOnError: true });
      return null;
    } catch {
      // No se muestra el mensaje técnico de KaTeX: menciona código y comandos
      // que el docente no tiene por qué conocer.
      return "Esa combinación no forma una ecuación válida. Revisá que los símbolos estén completos.";
    }
  }, [tex]);

  function insertarLatex(latex: string) {
    if (!refCampo.current) return;
    refCampo.current.focus();
    refCampo.current.insert(latex, { selectionMode: "placeholder" });
    setTex(refCampo.current.getValue("latex"));
  }

  function insertarSimbolo(simbolo: Simbolo) {
    insertarLatex(simbolo.latex);
  }

  function insertarMatriz() {
    insertarLatex(latexMatriz(filasMatriz, columnasMatriz));
  }

  function insertarSistema() {
    insertarLatex(latexSistema(cantidadSistema));
  }

  function confirmar() {
    if (!tex.trim() || error) return;
    const textoConDelimitadores = modo === "bloque" ? `$$${tex}$$` : `$${tex}$`;
    onInsertar({ textoConDelimitadores });
  }

  // Escape cierra el editor aunque el foco no esté dentro del diálogo (p. ej. si
  // el campo matemático todavía se está cargando).
  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") onCancelar();
    }
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCancelar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitulo}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-borde bg-blanco shadow-lg">
        <div className="flex items-center justify-between border-b-2 border-amarillo-600 px-5 py-4">
          <h2 id={idTitulo} className="text-lg font-bold text-lila-800">
            Editor de ecuaciones
          </h2>
          <button
            type="button"
            onClick={onCancelar}
            aria-label="Cerrar editor de ecuaciones"
            className="rounded-md p-1.5 text-texto-secundario hover:bg-lila-50"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${idTitulo}-campo`} className="text-sm font-medium text-texto">
              Ecuación
            </label>

            {!listo ? (
              <div className="flex h-16 items-center justify-center rounded-lg border border-borde bg-lila-50 text-sm text-texto-secundario">
                Cargando editor…
              </div>
            ) : (
              <math-field
                id={`${idTitulo}-campo`}
                ref={refCampo}
                virtual-keyboard-mode="auto"
                style={{ "--hue": 213, width: "100%" } as React.CSSProperties}
                className="editor-ecuaciones-campo w-full rounded-lg border border-borde px-3 py-2.5 text-lg focus-within:border-lila-600"
              />
            )}
            <p className="mt-1 text-xs text-texto-secundario">
              Elegí un símbolo o estructura de abajo, o escribí directamente. Usá Tab o las flechas para moverte
              entre los espacios de una fracción, raíz, etc.
            </p>

            {error && (
              <p role="alert" className="alerta-error mt-1">
                {error}
              </p>
            )}
          </div>

          <fieldset className="mt-4 flex items-center gap-4">
            <legend className="mb-1 text-sm font-medium text-texto">Presentación</legend>
            <label className="flex items-center gap-1.5 text-sm text-texto">
              <input type="radio" name="modo-ecuacion" checked={modo === "linea"} onChange={() => setModo("linea")} />
              En línea
            </label>
            <label className="flex items-center gap-1.5 text-sm text-texto">
              <input type="radio" name="modo-ecuacion" checked={modo === "bloque"} onChange={() => setModo("bloque")} />
              Centrada (bloque aparte)
            </label>
          </fieldset>

          <div role="tablist" aria-label="Categorías de símbolos" className="mt-5 flex flex-wrap gap-1 border-b border-borde pb-2">
            {PESTANIAS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={pestania === p.id}
                onClick={() => setPestania(p.id)}
                className={`rounded-t-lg px-3 py-2 text-sm font-medium ${
                  pestania === p.id ? "bg-lila-100 text-lila-800" : "text-texto-secundario hover:bg-lila-50"
                }`}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>

          {PESTANIAS_SIMPLES.map(
            (p) =>
              pestania === p.id && (
                <div key={p.id} role="tabpanel" className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {p.simbolos.map((s, indice) => (
                    <button
                      key={indice}
                      type="button"
                      onClick={() => insertarSimbolo(s)}
                      title={s.descripcion ?? s.etiqueta}
                      aria-label={s.descripcion ?? s.etiqueta}
                      className="flex min-h-11 items-center justify-center rounded-lg border border-borde bg-blanco px-1 text-base font-medium text-texto hover:border-lila-600 hover:bg-lila-50 hover:text-lila-800"
                    >
                      {s.etiqueta}
                    </button>
                  ))}
                </div>
              )
          )}

          {pestania === ID_PESTANIA_MATRICES && (
            <div role="tabpanel" className="mt-3 flex flex-col gap-5">
              <div>
                <p className="mb-2 text-sm font-medium text-texto">
                  Matriz — elegí el tamaño ({filasHover || filasMatriz}×{columnasHover || columnasMatriz})
                </p>
                <div
                  className="inline-grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${COLUMNAS_MAX_MATRIZ}, minmax(0,1fr))` }}
                  onMouseLeave={() => {
                    setFilasHover(0);
                    setColumnasHover(0);
                  }}
                >
                  {Array.from({ length: FILAS_MAX_MATRIZ }, (_, f) =>
                    Array.from({ length: COLUMNAS_MAX_MATRIZ }, (_, c) => {
                      const fila = f + 1;
                      const columna = c + 1;
                      const resaltada = fila <= (filasHover || filasMatriz) && columna <= (columnasHover || columnasMatriz);
                      return (
                        <button
                          key={`${fila}-${columna}`}
                          type="button"
                          aria-label={`Matriz de ${fila} filas por ${columna} columnas`}
                          title={`${fila}×${columna}`}
                          onMouseEnter={() => {
                            setFilasHover(fila);
                            setColumnasHover(columna);
                          }}
                          onClick={() => {
                            setFilasMatriz(fila);
                            setColumnasMatriz(columna);
                          }}
                          className={`h-7 w-7 rounded border ${
                            resaltada ? "border-lila-600 bg-lila-100" : "border-borde bg-blanco"
                          }`}
                        />
                      );
                    })
                  )}
                </div>
                <button type="button" onClick={insertarMatriz} className="btn-neutro mt-3 text-sm">
                  Insertar matriz {filasMatriz}×{columnasMatriz}
                </button>
              </div>

              <div className="border-t border-borde pt-4">
                <p className="mb-2 text-sm font-medium text-texto">Sistema de ecuaciones — cantidad de ecuaciones</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Quitar una ecuación del sistema"
                    disabled={cantidadSistema <= ECUACIONES_MIN_SISTEMA}
                    onClick={() => setCantidadSistema((n) => Math.max(ECUACIONES_MIN_SISTEMA, n - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-borde bg-blanco text-lg font-bold text-lila-800 hover:bg-lila-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold text-texto">{cantidadSistema}</span>
                  <button
                    type="button"
                    aria-label="Agregar una ecuación al sistema"
                    disabled={cantidadSistema >= ECUACIONES_MAX_SISTEMA}
                    onClick={() => setCantidadSistema((n) => Math.min(ECUACIONES_MAX_SISTEMA, n + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-borde bg-blanco text-lg font-bold text-lila-800 hover:bg-lila-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    +
                  </button>
                  <button type="button" onClick={insertarSistema} className="btn-neutro text-sm">
                    Insertar sistema de {cantidadSistema} ecuaciones
                  </button>
                </div>
              </div>

              <div className="border-t border-borde pt-4">
                <p className="mb-2 text-sm font-medium text-texto">Vector</p>
                <button
                  type="button"
                  onClick={() => insertarSimbolo({ etiqueta: "v⃗", latex: "\\vec{\\placeholder{}}" })}
                  title="Vector"
                  aria-label="Vector"
                  className="flex min-h-11 w-20 items-center justify-center rounded-lg border border-borde bg-blanco text-base font-medium text-texto hover:border-lila-600 hover:bg-lila-50 hover:text-lila-800"
                >
                  v⃗
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-borde px-5 py-4">
          {puedeEliminar && onEliminar ? (
            <button
              type="button"
              onClick={onEliminar}
              className="flex items-center gap-1.5 text-sm font-medium text-error hover:underline"
            >
              <Trash2 size={16} aria-hidden />
              Eliminar ecuación
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onCancelar} className="btn-neutro">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!tex.trim() || !!error}
              onClick={confirmar}
              className="btn-primario disabled:cursor-not-allowed disabled:opacity-50"
            >
              Insertar ecuación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Botón de barra de herramientas para abrir el editor de ecuaciones. */
export function BotonInsertarEcuacion({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-md border border-borde bg-blanco px-2 py-1 text-xs font-medium text-lila-700 hover:border-lila-600 hover:bg-lila-50"
      title="Insertar ecuación (fx)"
      aria-label="Insertar ecuación"
    >
      <Sigma size={14} aria-hidden />
      Ecuación (fx)
    </button>
  );
}
