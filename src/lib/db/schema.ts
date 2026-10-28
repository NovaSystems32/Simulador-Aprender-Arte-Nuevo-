import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Espejo en TypeScript de db/migrations/0001_init.sql. La fuente de verdad del
// esquema es el SQL de las migraciones; este archivo solo le da a Drizzle (y
// a la app) tipos y un query builder para esas mismas tablas.

export const rolUsuario = pgEnum("rol_usuario", ["admin", "docente", "estudiante"]);
export const ejeMatematico = pgEnum("eje_matematico", [
  "numeros_operaciones",
  "algebra_funciones",
  "geometria_medida",
  "estadistica_probabilidad",
]);
export const capacidadEvaluada = pgEnum("capacidad_evaluada", [
  "reconocimiento_conceptos",
  "interpretacion_informacion",
  "resolucion_problemas",
  "comunicacion_matematica",
  "modelizacion",
  "aplicacion_procedimientos",
  "analisis_graficos_tablas",
  "argumentacion",
]);
export const nivelDificultad = pgEnum("nivel_dificultad", ["inicial", "medio", "avanzado"]);
export const estadoPregunta = pgEnum("estado_pregunta", ["borrador", "activa", "archivada"]);
export const opcionLetra = pgEnum("opcion_letra", ["A", "B", "C", "D"]);
export const tipoEvaluacion = pgEnum("tipo_evaluacion", ["manual", "automatica"]);
export const estadoEvaluacion = pgEnum("estado_evaluacion", ["borrador", "publicada", "archivada"]);
export const estadoIntento = pgEnum("estado_intento", [
  "no_iniciado",
  "en_curso",
  "entregado",
  "expirado",
]);
export const tipoAgrupacionResultado = pgEnum("tipo_agrupacion_resultado", [
  "eje",
  "contenido",
  "capacidad",
  "dificultad",
]);

export const instituciones = pgTable("instituciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// id: el uid del usuario en Firebase Auth (proyecto nuevo, solo Auth). Es
// "text" y no "uuid": los uid de Firebase no tienen formato UUID. Sin
// default: la app lo inserta explícitamente al crear el usuario.
export const perfiles = pgTable("perfiles", {
  id: text("id").primaryKey(),
  institucionId: uuid("institucion_id").references(() => instituciones.id, { onDelete: "set null" }),
  rol: rolUsuario("rol").notNull().default("estudiante"),
  nombre: text("nombre").notNull(),
  apellido: text("apellido").notNull(),
  email: text("email").notNull(),
  activo: boolean("activo").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailUnico: uniqueIndex("perfiles_email_key").on(t.email),
}));

export const cursos = pgTable("cursos", {
  id: uuid("id").primaryKey().defaultRandom(),
  institucionId: uuid("institucion_id").references(() => instituciones.id, { onDelete: "set null" }),
  nombre: text("nombre").notNull(),
  division: text("division").notNull(),
  anioLectivo: integer("anio_lectivo").notNull(),
  docenteTitularId: text("docente_titular_id").references(() => perfiles.id, { onDelete: "set null" }),
  activo: boolean("activo").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cursoIntegrantes = pgTable("curso_integrantes", {
  id: uuid("id").primaryKey().defaultRandom(),
  cursoId: uuid("curso_id").notNull().references(() => cursos.id, { onDelete: "cascade" }),
  perfilId: text("perfil_id").notNull().references(() => perfiles.id, { onDelete: "cascade" }),
  rolEnCurso: text("rol_en_curso").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  cursoPerfilUnico: uniqueIndex("curso_integrantes_curso_id_perfil_id_key").on(t.cursoId, t.perfilId),
}));

export const preguntas = pgTable("preguntas", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: text("codigo").notNull(),
  enunciado: text("enunciado").notNull(),
  recursoUrl: text("recurso_url"),
  recursoAlt: text("recurso_alt"),
  opcionA: text("opcion_a").notNull(),
  opcionB: text("opcion_b").notNull(),
  opcionC: text("opcion_c").notNull(),
  opcionD: text("opcion_d").notNull(),
  respuestaCorrecta: opcionLetra("respuesta_correcta").notNull(),
  explicacion: text("explicacion").notNull(),
  eje: ejeMatematico("eje").notNull(),
  contenido: text("contenido").notNull(),
  capacidad: capacidadEvaluada("capacidad").notNull(),
  dificultad: nivelDificultad("dificultad").notNull(),
  cursoId: uuid("curso_id").references(() => cursos.id, { onDelete: "set null" }),
  autorId: text("autor_id").references(() => perfiles.id, { onDelete: "set null" }),
  estado: estadoPregunta("estado").notNull().default("borrador"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  codigoUnico: uniqueIndex("preguntas_codigo_key").on(t.codigo),
}));

export const evaluaciones = pgTable("evaluaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  cursoId: uuid("curso_id").notNull().references(() => cursos.id, { onDelete: "cascade" }),
  tipo: tipoEvaluacion("tipo").notNull(),
  fechaApertura: timestamp("fecha_apertura", { withTimezone: true }),
  fechaCierre: timestamp("fecha_cierre", { withTimezone: true }),
  duracionMinutos: integer("duracion_minutos").notNull(),
  cantidadPreguntas: integer("cantidad_preguntas").notNull(),
  ordenAleatorioPreguntas: boolean("orden_aleatorio_preguntas").notNull().default(true),
  ordenAleatorioOpciones: boolean("orden_aleatorio_opciones").notNull().default(true),
  intentosMax: integer("intentos_max").notNull().default(1),
  puntajeAprobacion: numeric("puntaje_aprobacion").notNull().default("60"),
  mostrarResultadoInmediato: boolean("mostrar_resultado_inmediato").notNull().default(true),
  permitirRevision: boolean("permitir_revision").notNull().default(true),
  mostrarResoluciones: boolean("mostrar_resoluciones").notNull().default(true),
  permitirCalculadora: boolean("permitir_calculadora").notNull().default(false),
  permitirHojaFormulas: boolean("permitir_hoja_formulas").notNull().default(false),
  descuentoPorIncorrecta: boolean("descuento_por_incorrecta").notNull().default(false),
  configAutomatica: jsonb("config_automatica"),
  estado: estadoEvaluacion("estado").notNull().default("borrador"),
  creadoPor: text("creado_por").references(() => perfiles.id, { onDelete: "set null" }),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const evaluacionPreguntas = pgTable("evaluacion_preguntas", {
  id: uuid("id").primaryKey().defaultRandom(),
  evaluacionId: uuid("evaluacion_id").notNull().references(() => evaluaciones.id, { onDelete: "cascade" }),
  preguntaId: uuid("pregunta_id").notNull().references(() => preguntas.id, { onDelete: "cascade" }),
  orden: integer("orden").notNull(),
}, (t) => ({
  evaluacionPreguntaUnico: uniqueIndex("evaluacion_preguntas_evaluacion_id_pregunta_id_key").on(
    t.evaluacionId,
    t.preguntaId
  ),
}));

export const asignaciones = pgTable("asignaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  evaluacionId: uuid("evaluacion_id").notNull().references(() => evaluaciones.id, { onDelete: "cascade" }),
  cursoId: uuid("curso_id").notNull().references(() => cursos.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  evaluacionCursoUnico: uniqueIndex("asignaciones_evaluacion_id_curso_id_key").on(t.evaluacionId, t.cursoId),
}));

export const intentos = pgTable("intentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  evaluacionId: uuid("evaluacion_id").notNull().references(() => evaluaciones.id, { onDelete: "cascade" }),
  estudianteId: text("estudiante_id").notNull().references(() => perfiles.id, { onDelete: "cascade" }),
  numeroIntento: integer("numero_intento").notNull(),
  estado: estadoIntento("estado").notNull().default("no_iniciado"),
  fechaInicio: timestamp("fecha_inicio", { withTimezone: true }),
  fechaEntrega: timestamp("fecha_entrega", { withTimezone: true }),
  tiempoLimiteSegundos: integer("tiempo_limite_segundos").notNull(),
  tiempoUtilizadoSegundos: integer("tiempo_utilizado_segundos"),
  puntajeObtenido: numeric("puntaje_obtenido"),
  porcentajeObtenido: numeric("porcentaje_obtenido"),
  correctas: integer("correctas"),
  incorrectas: integer("incorrectas"),
  sinResponder: integer("sin_responder"),
  aprobado: boolean("aprobado"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  evaluacionEstudianteNumeroUnico: uniqueIndex(
    "intentos_evaluacion_id_estudiante_id_numero_intento_key"
  ).on(t.evaluacionId, t.estudianteId, t.numeroIntento),
}));

export const intentoPreguntas = pgTable("intento_preguntas", {
  id: uuid("id").primaryKey().defaultRandom(),
  intentoId: uuid("intento_id").notNull().references(() => intentos.id, { onDelete: "cascade" }),
  preguntaId: uuid("pregunta_id").notNull().references(() => preguntas.id, { onDelete: "cascade" }),
  orden: integer("orden").notNull(),
  enunciado: text("enunciado").notNull(),
  recursoUrl: text("recurso_url"),
  recursoAlt: text("recurso_alt"),
  opciones: jsonb("opciones").notNull().$type<{ letra: "A" | "B" | "C" | "D"; texto: string }[]>(),
  respuestaCorrecta: opcionLetra("respuesta_correcta").notNull(),
  explicacion: text("explicacion").notNull(),
  eje: ejeMatematico("eje").notNull(),
  contenido: text("contenido").notNull(),
  capacidad: capacidadEvaluada("capacidad").notNull(),
  dificultad: nivelDificultad("dificultad").notNull(),
}, (t) => ({
  intentoPreguntaUnico: uniqueIndex("intento_preguntas_intento_id_pregunta_id_key").on(
    t.intentoId,
    t.preguntaId
  ),
}));

export const respuestasEstudiante = pgTable("respuestas_estudiante", {
  id: uuid("id").primaryKey().defaultRandom(),
  intentoId: uuid("intento_id").notNull().references(() => intentos.id, { onDelete: "cascade" }),
  preguntaId: uuid("pregunta_id").notNull().references(() => preguntas.id, { onDelete: "cascade" }),
  opcionSeleccionada: opcionLetra("opcion_seleccionada"),
  marcadaParaRevisar: boolean("marcada_para_revisar").notNull().default(false),
  respondidaEn: timestamp("respondida_en", { withTimezone: true }),
}, (t) => ({
  intentoPreguntaUnico: uniqueIndex("respuestas_estudiante_intento_id_pregunta_id_key").on(
    t.intentoId,
    t.preguntaId
  ),
}));

export const resultadoDesglose = pgTable("resultado_desglose", {
  id: uuid("id").primaryKey().defaultRandom(),
  intentoId: uuid("intento_id").notNull().references(() => intentos.id, { onDelete: "cascade" }),
  tipoAgrupacion: tipoAgrupacionResultado("tipo_agrupacion").notNull(),
  clave: text("clave").notNull(),
  correctas: integer("correctas").notNull(),
  total: integer("total").notNull(),
  porcentaje: numeric("porcentaje").notNull(),
});

export const configuraciones = pgTable("configuraciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  institucionId: uuid("institucion_id").references(() => instituciones.id, { onDelete: "cascade" }),
  clave: text("clave").notNull(),
  valor: jsonb("valor").notNull(),
}, (t) => ({
  institucionClaveUnico: uniqueIndex("configuraciones_institucion_id_clave_key").on(
    t.institucionId,
    t.clave
  ),
}));

export const auditoriaAdmin = pgTable("auditoria_admin", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: text("admin_id").references(() => perfiles.id, { onDelete: "set null" }),
  adminEmail: text("admin_email").notNull(),
  accion: text("accion").notNull(),
  tablaAfectada: text("tabla_afectada").notNull(),
  registroId: uuid("registro_id"),
  cantidadRegistros: integer("cantidad_registros").notNull().default(1),
  detalle: jsonb("detalle"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
