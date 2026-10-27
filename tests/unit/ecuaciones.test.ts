import { describe, expect, it } from "vitest";
import katex from "katex";
import { segmentarFormulas } from "@/components/preguntas/VistaPreviaMatematica";

function tipos(texto: string) {
  return segmentarFormulas(texto).map((s) => (s.tipo === "formula" ? `${s.modo}:${s.tex}` : `texto:${s.contenido}`));
}

describe("segmentarFormulas", () => {
  it("devuelve un solo segmento de texto si no hay fórmulas", () => {
    expect(tipos("Calcular el área")).toEqual(["texto:Calcular el área"]);
  });

  it("mezcla texto y varias ecuaciones en línea y en bloque", () => {
    expect(tipos("Si $x^2=4$ entonces $$\\frac{a}{b}$$ y fin")).toEqual([
      "texto:Si ",
      "linea:x^2=4",
      "texto: entonces ",
      "bloque:\\frac{a}{b}",
      "texto: y fin",
    ]);
  });

  it("conserva el rango exacto de cada ecuación en el texto original", () => {
    const texto = "a $x$ b $$y$$ c";
    for (const s of segmentarFormulas(texto)) {
      if (s.tipo === "formula") {
        const original = texto.slice(s.inicio, s.fin);
        expect(original).toBe(s.modo === "bloque" ? `$$${s.tex}$$` : `$${s.tex}$`);
      }
    }
  });

  it("borrar una ecuación por su rango no afecta al resto del texto", () => {
    const texto = "Uno $a$ dos $b$ tres";
    const formulas = segmentarFormulas(texto).filter((s) => s.tipo === "formula");
    const primera = formulas[0];
    const resultado = texto.slice(0, primera.inicio) + texto.slice(primera.fin);
    expect(resultado).toBe("Uno  dos $b$ tres");
  });

  it("no confunde precios en pesos con fórmulas", () => {
    const t = "cuestan $9000 y otros cuestan $9500";
    expect(segmentarFormulas(t).every((s) => s.tipo === "texto")).toBe(true);
  });

  it("los preguntas antiguas sin delimitadores quedan intactas", () => {
    expect(tipos("2x + 3 = 7")).toEqual(["texto:2x + 3 = 7"]);
  });
});

describe("LaTeX de las estructuras del editor en KaTeX (modo seguro)", () => {
  const estructuras: Record<string, string> = {
    fraccion: "\\frac{a+1}{b}",
    exponente: "x^{2}",
    subindice: "x_{n}",
    raiz: "\\sqrt{x}",
    raizN: "\\sqrt[3]{x}",
    integral: "\\int_{0}^{1} x\\,dx",
    sumatoria: "\\sum_{i=1}^{n} i",
    limite: "\\lim_{x\\to 0} \\frac{\\sin x}{x}",
    matriz: "\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}",
    sistema: "\\begin{cases} x+y=3 \\\\ x-y=1 \\end{cases}",
    vector: "\\vec{v}",
    griegas: "\\alpha \\beta \\theta \\pi \\Delta \\Sigma",
    relaciones: "\\neq \\leq \\geq \\pm \\infty \\approx \\times \\div",
  };

  for (const [nombre, tex] of Object.entries(estructuras)) {
    it(`renderiza ${nombre}`, () => {
      const html = katex.renderToString(tex, { trust: false, strict: "warn", throwOnError: true });
      expect(html).toContain("katex");
    });
  }

  it("rechaza LaTeX inválido", () => {
    expect(() => katex.renderToString("\\frac{1", { throwOnError: true })).toThrow();
  });

  it("no ejecuta enlaces externos (trust:false)", () => {
    const html = katex.renderToString("\\href{http://x.com}{a}", { trust: false, throwOnError: false });
    expect(html).not.toContain("<a ");
    expect(html).not.toContain('href="http://x.com"');
  });
});
