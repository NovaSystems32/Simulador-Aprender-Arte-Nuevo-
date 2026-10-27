import { describe, expect, it } from "vitest";
import { corregirIntento, mensajeDesempeno, type PreguntaParaCorregir, type RespuestaParaCorregir } from "@/lib/scoring";

const preguntas: PreguntaParaCorregir[] = [
  {
    pregunta_id: "p1",
    respuesta_correcta: "A",
    eje: "numeros_operaciones",
    contenido: "Fracciones",
    capacidad: "reconocimiento_conceptos",
    dificultad: "inicial",
  },
  {
    pregunta_id: "p2",
    respuesta_correcta: "B",
    eje: "numeros_operaciones",
    contenido: "Porcentajes",
    capacidad: "resolucion_problemas",
    dificultad: "medio",
  },
  {
    pregunta_id: "p3",
    respuesta_correcta: "C",
    eje: "geometria_medida",
    contenido: "Perímetro",
    capacidad: "aplicacion_procedimientos",
    dificultad: "medio",
  },
  {
    pregunta_id: "p4",
    respuesta_correcta: "D",
    eje: "geometria_medida",
    contenido: "Volumen",
    capacidad: "aplicacion_procedimientos",
    dificultad: "avanzado",
  },
];

describe("corregirIntento", () => {
  it("cuenta correctas, incorrectas y sin responder", () => {
    const resultado = corregirIntento(
      preguntas,
      [
        { pregunta_id: "p1", opcion_seleccionada: "A" }, // correcta
        { pregunta_id: "p2", opcion_seleccionada: "A" }, // incorrecta
        { pregunta_id: "p3", opcion_seleccionada: null }, // sin responder
        // p4 ni siquiera aparece en las respuestas: también cuenta sin responder
      ],
      { puntajeAprobacion: 60, descuentoPorIncorrecta: false }
    );

    expect(resultado.correctas).toBe(1);
    expect(resultado.incorrectas).toBe(1);
    expect(resultado.sin_responder).toBe(2);
    expect(resultado.porcentaje_obtenido).toBe(25);
    expect(resultado.aprobado).toBe(false);
  });

  it("aplica la fórmula porcentaje = correctas / total * 100", () => {
    const resultado = corregirIntento(
      preguntas,
      preguntas.map((p) => ({ pregunta_id: p.pregunta_id, opcion_seleccionada: p.respuesta_correcta })),
      { puntajeAprobacion: 60, descuentoPorIncorrecta: false }
    );

    expect(resultado.correctas).toBe(4);
    expect(resultado.porcentaje_obtenido).toBe(100);
    expect(resultado.aprobado).toBe(true);
  });

  it("no aplica descuento por incorrectas salvo que se active explícitamente", () => {
    const respuestasConDosIncorrectas: RespuestaParaCorregir[] = [
      { pregunta_id: "p1", opcion_seleccionada: "A" },
      { pregunta_id: "p2", opcion_seleccionada: "A" }, // incorrecta
      { pregunta_id: "p3", opcion_seleccionada: "A" }, // incorrecta
      { pregunta_id: "p4", opcion_seleccionada: "D" },
    ];

    const sinDescuento = corregirIntento(preguntas, respuestasConDosIncorrectas, {
      puntajeAprobacion: 60,
      descuentoPorIncorrecta: false,
    });
    expect(sinDescuento.puntaje_obtenido).toBe(2);

    const conDescuento = corregirIntento(preguntas, respuestasConDosIncorrectas, {
      puntajeAprobacion: 60,
      descuentoPorIncorrecta: true,
    });
    // 2 correctas - 2 incorrectas * 0.25 = 1.5
    expect(conDescuento.puntaje_obtenido).toBe(1.5);
  });

  it("calcula el desglose por eje, contenido, capacidad y dificultad", () => {
    const resultado = corregirIntento(
      preguntas,
      [
        { pregunta_id: "p1", opcion_seleccionada: "A" },
        { pregunta_id: "p2", opcion_seleccionada: "B" },
        { pregunta_id: "p3", opcion_seleccionada: "X" as never },
        { pregunta_id: "p4", opcion_seleccionada: "D" },
      ],
      { puntajeAprobacion: 60, descuentoPorIncorrecta: false }
    );

    const ejeNumeros = resultado.desglose.find(
      (d) => d.tipo_agrupacion === "eje" && d.clave === "numeros_operaciones"
    );
    expect(ejeNumeros).toEqual({
      tipo_agrupacion: "eje",
      clave: "numeros_operaciones",
      correctas: 2,
      total: 2,
      porcentaje: 100,
    });

    const ejeGeometria = resultado.desglose.find(
      (d) => d.tipo_agrupacion === "eje" && d.clave === "geometria_medida"
    );
    expect(ejeGeometria).toEqual({
      tipo_agrupacion: "eje",
      clave: "geometria_medida",
      correctas: 1,
      total: 2,
      porcentaje: 50,
    });
  });

  it("nunca da porcentaje NaN cuando no hay preguntas", () => {
    const resultado = corregirIntento([], [], { puntajeAprobacion: 60, descuentoPorIncorrecta: false });
    expect(resultado.porcentaje_obtenido).toBe(0);
    expect(resultado.aprobado).toBe(false);
  });
});

describe("mensajeDesempeno", () => {
  it("usa mensajes educativos y respetuosos según el porcentaje", () => {
    expect(mensajeDesempeno(90)).toBe("Contenido logrado");
    expect(mensajeDesempeno(60)).toBe("Contenido en proceso");
    expect(mensajeDesempeno(20)).toBe("Necesitás seguir practicando");
    expect(mensajeDesempeno(0)).toBe("Revisá el procedimiento utilizado");
  });

  it("nunca usa expresiones punitivas", () => {
    const mensajes = [0, 10, 30, 50, 70, 90, 100].map(mensajeDesempeno);
    for (const mensaje of mensajes) {
      expect(mensaje.toLowerCase()).not.toMatch(/fracas|mal[oa]/);
    }
  });
});
