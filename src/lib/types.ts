// Tipos de dominio compartidos entre cliente y servidor.
// Reflejan el esquema definido en supabase/migrations/0001_init.sql

export type RolUsuario = "admin" | "docente" | "estudiante";

export type EjeMatematico =
  | "numeros_operaciones"
  | "algebra_funciones"
  | "geometria_medida"
  | "estadistica_probabilidad";

export const EJES: { value: EjeMatematico; label: string }[] = [
  { value: "numeros_operaciones", label: "Números y operaciones" },
  { value: "algebra_funciones", label: "Álgebra y funciones" },
  { value: "geometria_medida", label: "Geometría y medida" },
  { value: "estadistica_probabilidad", label: "Estadística y probabilidad" },
];

export type CapacidadEvaluada =
  | "reconocimiento_conceptos"
  | "interpretacion_informacion"
  | "resolucion_problemas"
  | "comunicacion_matematica"
  | "modelizacion"
  | "aplicacion_procedimientos"
  | "analisis_graficos_tablas"
  | "argumentacion";

export const CAPACIDADES: { value: CapacidadEvaluada; label: string }[] = [
  { value: "reconocimiento_conceptos", label: "Reconocimiento de conceptos" },
  { value: "interpretacion_informacion", label: "Interpretación de información" },
  { value: "resolucion_problemas", label: "Resolución de problemas" },
  { value: "comunicacion_matematica", label: "Comunicación matemática" },
  { value: "modelizacion", label: "Modelización" },
  { value: "aplicacion_procedimientos", label: "Aplicación de procedimientos" },
  { value: "analisis_graficos_tablas", label: "Análisis de gráficos y tablas" },
  { value: "argumentacion", label: "Argumentación" },
];

export type NivelDificultad = "inicial" | "medio" | "avanzado";

export const DIFICULTADES: { value: NivelDificultad; label: string }[] = [
  { value: "inicial", label: "Inicial" },
  { value: "medio", label: "Medio" },
  { value: "avanzado", label: "Avanzado" },
];

export type EstadoPregunta = "borrador" | "activa" | "archivada";
export type OpcionLetra = "A" | "B" | "C" | "D";
export type TipoEvaluacion = "manual" | "automatica";
export type EstadoEvaluacion = "borrador" | "publicada" | "archivada";
export type EstadoIntento = "no_iniciado" | "en_curso" | "entregado" | "expirado";
export type TipoAgrupacionResultado = "eje" | "contenido" | "capacidad" | "dificultad";

export interface Perfil {
  id: string;
  institucion_id: string | null;
  rol: RolUsuario;
  nombre: string;
  apellido: string;
  email: string;
  activo: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Curso {
  id: string;
  institucion_id: string | null;
  nombre: string;
  division: string;
  anio_lectivo: number;
  docente_titular_id: string | null;
  activo: boolean;
  is_demo: boolean;
  created_at: string;
}

export interface Pregunta {
  id: string;
  codigo: string;
  enunciado: string;
  recurso_url: string | null;
  recurso_alt: string | null;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  respuesta_correcta: OpcionLetra;
  explicacion: string;
  eje: EjeMatematico;
  contenido: string;
  capacidad: CapacidadEvaluada;
  dificultad: NivelDificultad;
  curso_id: string | null;
  autor_id: string | null;
  estado: EstadoPregunta;
  created_at: string;
  updated_at: string;
}

export interface ConfigAutomatica {
  distribucion: {
    eje: EjeMatematico;
    cantidad: number;
    contenido?: string | null;
    capacidad?: CapacidadEvaluada | null;
    dificultad?: NivelDificultad | null;
  }[];
}

export interface Evaluacion {
  id: string;
  nombre: string;
  descripcion: string | null;
  curso_id: string;
  tipo: TipoEvaluacion;
  fecha_apertura: string | null;
  fecha_cierre: string | null;
  duracion_minutos: number;
  cantidad_preguntas: number;
  orden_aleatorio_preguntas: boolean;
  orden_aleatorio_opciones: boolean;
  intentos_max: number;
  puntaje_aprobacion: number;
  mostrar_resultado_inmediato: boolean;
  permitir_revision: boolean;
  mostrar_resoluciones: boolean;
  permitir_calculadora: boolean;
  permitir_hoja_formulas: boolean;
  descuento_por_incorrecta: boolean;
  config_automatica: ConfigAutomatica | null;
  estado: EstadoEvaluacion;
  creado_por: string;
  is_demo: boolean;
  created_at: string;
}

export interface AuditoriaAdmin {
  id: string;
  admin_id: string | null;
  admin_email: string;
  accion: string;
  tabla_afectada: string;
  registro_id: string | null;
  cantidad_registros: number;
  detalle: Record<string, unknown> | null;
  created_at: string;
}

export interface Intento {
  id: string;
  evaluacion_id: string;
  estudiante_id: string;
  numero_intento: number;
  estado: EstadoIntento;
  fecha_inicio: string | null;
  fecha_entrega: string | null;
  tiempo_limite_segundos: number;
  tiempo_utilizado_segundos: number | null;
  puntaje_obtenido: number | null;
  porcentaje_obtenido: number | null;
  correctas: number | null;
  incorrectas: number | null;
  sin_responder: number | null;
  aprobado: boolean | null;
  created_at: string;
}

/** Opción de una pregunta ya barajada, tal como la ve el estudiante */
export interface OpcionIntento {
  letra: OpcionLetra;
  texto: string;
}

/** Pregunta de un intento sin respuesta correcta expuesta (lo que recibe el navegador del estudiante) */
export interface PreguntaIntentoPublica {
  pregunta_id: string;
  orden: number;
  enunciado: string;
  recurso_url: string | null;
  recurso_alt: string | null;
  opciones: OpcionIntento[];
  eje: EjeMatematico;
}

export interface RespuestaEstudiante {
  pregunta_id: string;
  opcion_seleccionada: OpcionLetra | null;
  marcada_para_revisar: boolean;
}

export interface ResultadoDesglose {
  tipo_agrupacion: TipoAgrupacionResultado;
  clave: string;
  correctas: number;
  total: number;
  porcentaje: number;
}
