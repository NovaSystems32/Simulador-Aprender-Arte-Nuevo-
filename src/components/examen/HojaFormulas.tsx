"use client";

import "katex/dist/katex.min.css";
import { InlineMath } from "react-katex";

const FORMULAS: { titulo: string; formula: string }[] = [
  { titulo: "Perímetro del rectángulo", formula: "P = 2(b + h)" },
  { titulo: "Área del rectángulo", formula: "A = b \\times h" },
  { titulo: "Área del triángulo", formula: "A = \\dfrac{b \\times h}{2}" },
  { titulo: "Área del círculo", formula: "A = \\pi r^2" },
  { titulo: "Perímetro del círculo", formula: "P = 2\\pi r" },
  { titulo: "Volumen del prisma rectangular", formula: "V = \\text{largo} \\times \\text{ancho} \\times \\text{altura}" },
  { titulo: "Teorema de Pitágoras", formula: "a^2 + b^2 = c^2" },
  { titulo: "Razones trigonométricas", formula: "\\sin\\alpha = \\dfrac{\\text{opuesto}}{\\text{hipotenusa}},\\ \\cos\\alpha = \\dfrac{\\text{adyacente}}{\\text{hipotenusa}},\\ \\tan\\alpha = \\dfrac{\\text{opuesto}}{\\text{adyacente}}" },
  { titulo: "Porcentaje", formula: "\\text{valor} = \\dfrac{\\%}{100} \\times \\text{total}" },
  { titulo: "Media aritmética", formula: "\\bar{x} = \\dfrac{\\sum x_i}{n}" },
  { titulo: "Probabilidad simple", formula: "P(A) = \\dfrac{\\text{casos favorables}}{\\text{casos posibles}}" },
];

export function HojaFormulas({ onCerrar }: { onCerrar: () => void }) {
  return (
    <div className="w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-borde bg-blanco p-4 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-texto-secundario">Hoja de fórmulas</p>
        <button type="button" onClick={onCerrar} aria-label="Cerrar hoja de fórmulas" className="text-texto-secundario hover:text-lila-700">
          ✕
        </button>
      </div>
      <ul className="flex flex-col gap-3 text-sm">
        {FORMULAS.map((f) => (
          <li key={f.titulo}>
            <p className="text-xs text-texto-secundario">{f.titulo}</p>
            <InlineMath math={f.formula} />
          </li>
        ))}
      </ul>
    </div>
  );
}
