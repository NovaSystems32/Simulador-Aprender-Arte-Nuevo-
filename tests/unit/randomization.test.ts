import { describe, expect, it } from "vitest";
import {
  barajarOpciones,
  crearGeneradorAleatorio,
  mezclar,
  ordenarPreguntasIntento,
  seleccionarPreguntasAutomaticas,
} from "@/lib/randomization";
import type { Pregunta } from "@/lib/types";

function crearPregunta(overrides: Partial<Pregunta>): Pregunta {
  return {
    id: overrides.id ?? "id",
    codigo: overrides.codigo ?? "COD-1",
    enunciado: "enunciado",
    recurso_url: null,
    recurso_alt: null,
    opcion_a: "a",
    opcion_b: "b",
    opcion_c: "c",
    opcion_d: "d",
    respuesta_correcta: "A",
    explicacion: "explicacion",
    eje: "numeros_operaciones",
    contenido: "contenido",
    capacidad: "reconocimiento_conceptos",
    dificultad: "inicial",
    curso_id: null,
    autor_id: "autor",
    estado: "activa",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("crearGeneradorAleatorio", () => {
  it("es determinístico: la misma semilla siempre da la misma secuencia", () => {
    const gen1 = crearGeneradorAleatorio(42);
    const gen2 = crearGeneradorAleatorio(42);
    const secuencia1 = Array.from({ length: 5 }, () => gen1());
    const secuencia2 = Array.from({ length: 5 }, () => gen2());
    expect(secuencia1).toEqual(secuencia2);
  });

  it("produce valores entre 0 y 1", () => {
    const gen = crearGeneradorAleatorio(7);
    for (let i = 0; i < 20; i++) {
      const valor = gen();
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(1);
    }
  });
});

describe("mezclar", () => {
  it("conserva todos los elementos originales", () => {
    const original = [1, 2, 3, 4, 5];
    const mezclado = mezclar(original, crearGeneradorAleatorio(1));
    expect(mezclado.sort()).toEqual(original.sort());
  });

  it("no muta el arreglo original", () => {
    const original = [1, 2, 3];
    mezclar(original, crearGeneradorAleatorio(1));
    expect(original).toEqual([1, 2, 3]);
  });

  it("con la misma semilla da siempre el mismo orden (reproducible para un intento)", () => {
    const a = mezclar([1, 2, 3, 4, 5, 6], crearGeneradorAleatorio(99));
    const b = mezclar([1, 2, 3, 4, 5, 6], crearGeneradorAleatorio(99));
    expect(a).toEqual(b);
  });
});

describe("barajarOpciones", () => {
  it("cuando aleatorio=false conserva el orden original A,B,C,D", () => {
    const pregunta = crearPregunta({});
    const opciones = barajarOpciones(pregunta, false);
    expect(opciones.map((o) => o.letraOriginal)).toEqual(["A", "B", "C", "D"]);
    expect(opciones.map((o) => o.letra)).toEqual(["A", "B", "C", "D"]);
  });

  it("cuando aleatorio=true conserva las 4 opciones pero permite reordenarlas", () => {
    const pregunta = crearPregunta({});
    const opciones = barajarOpciones(pregunta, true, crearGeneradorAleatorio(5));
    expect(opciones).toHaveLength(4);
    expect(new Set(opciones.map((o) => o.letraOriginal))).toEqual(new Set(["A", "B", "C", "D"]));
    expect(opciones.map((o) => o.letra)).toEqual(["A", "B", "C", "D"]);
  });

  it("permite recuperar la letra original para poder corregir después", () => {
    const pregunta = crearPregunta({ opcion_a: "uno", opcion_b: "dos", opcion_c: "tres", opcion_d: "cuatro" });
    const opciones = barajarOpciones(pregunta, true, crearGeneradorAleatorio(123));
    for (const opcion of opciones) {
      const textoEsperado = { A: "uno", B: "dos", C: "tres", D: "cuatro" }[opcion.letraOriginal];
      expect(opcion.texto).toBe(textoEsperado);
    }
  });
});

describe("seleccionarPreguntasAutomaticas", () => {
  const banco: Pregunta[] = [
    ...Array.from({ length: 6 }, (_, i) =>
      crearPregunta({ id: `num-${i}`, codigo: `NUM-${i}`, eje: "numeros_operaciones" })
    ),
    ...Array.from({ length: 3 }, (_, i) =>
      crearPregunta({ id: `geo-${i}`, codigo: `GEO-${i}`, eje: "geometria_medida" })
    ),
  ];

  it("respeta la distribución solicitada por eje", () => {
    const { preguntas, errores } = seleccionarPreguntasAutomaticas(
      banco,
      { distribucion: [{ eje: "numeros_operaciones", cantidad: 4 }] },
      crearGeneradorAleatorio(1)
    );
    expect(preguntas).toHaveLength(4);
    expect(preguntas.every((p) => p.eje === "numeros_operaciones")).toBe(true);
    expect(errores).toHaveLength(0);
  });

  it("nunca repite la misma pregunta en distintos grupos", () => {
    const { preguntas } = seleccionarPreguntasAutomaticas(
      banco,
      {
        distribucion: [
          { eje: "numeros_operaciones", cantidad: 6 },
          { eje: "geometria_medida", cantidad: 3 },
        ],
      },
      crearGeneradorAleatorio(1)
    );
    const ids = preguntas.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("reporta un error cuando no hay suficientes preguntas disponibles en un eje", () => {
    const { preguntas, errores } = seleccionarPreguntasAutomaticas(
      banco,
      { distribucion: [{ eje: "geometria_medida", cantidad: 10 }] },
      crearGeneradorAleatorio(1)
    );
    expect(preguntas).toHaveLength(3);
    expect(errores).toEqual([{ eje: "geometria_medida", solicitadas: 10, disponibles: 3 }]);
  });
});

describe("ordenarPreguntasIntento", () => {
  it("cuando aleatorio=false mantiene el orden original", () => {
    const orden = ordenarPreguntasIntento([1, 2, 3, 4], false);
    expect(orden).toEqual([1, 2, 3, 4]);
  });
});
