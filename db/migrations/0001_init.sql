-- =====================================================================
-- Simulador Aprender Arte Nuevo — Esquema inicial de base de datos (Neon)
-- =====================================================================
-- Estructura equivalente a la de Simulador_Aprender (proyecto original),
-- consolidando el estado final de sus 5 migraciones de Supabase, con dos
-- adaptaciones obligatorias porque la base ya no vive dentro de Supabase:
--
--   1. `perfiles.id` ya NO tiene FK a `auth.users` (esa tabla no existe
--      aquí: la autenticación vive en un proyecto Supabase separado, solo
--      para Auth + Storage). Es una columna uuid sin default: el valor lo
--      asigna la aplicación con el id del usuario de Supabase Auth, en el
--      mismo flujo que lo crea (ver src/lib/db/usuarios.ts).
--   2. Las políticas RLS ya no pueden usar `auth.uid()` (no existe en
--      Neon). Se reemplaza por `usuario_actual_id()`, que lee la variable
--      de sesión `app.usuario_id` fijada con `SET LOCAL` por la capa de
--      datos del servidor en cada conexión, después de validar la sesión
--      de Supabase Auth. Mismo mecanismo de fondo, distinta fuente.
--
-- Es DDL puro: no hay un solo INSERT de datos en todo el archivo.
-- Es idempotente (IF NOT EXISTS / DROP ... IF EXISTS) para poder
-- re-ejecutarse de forma segura.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type rol_usuario as enum ('admin', 'docente', 'estudiante');
exception when duplicate_object then null; end $$;

do $$ begin
  create type eje_matematico as enum (
    'numeros_operaciones',
    'algebra_funciones',
    'geometria_medida',
    'estadistica_probabilidad'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type capacidad_evaluada as enum (
    'reconocimiento_conceptos',
    'interpretacion_informacion',
    'resolucion_problemas',
    'comunicacion_matematica',
    'modelizacion',
    'aplicacion_procedimientos',
    'analisis_graficos_tablas',
    'argumentacion'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type nivel_dificultad as enum ('inicial', 'medio', 'avanzado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_pregunta as enum ('borrador', 'activa', 'archivada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type opcion_letra as enum ('A', 'B', 'C', 'D');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_evaluacion as enum ('manual', 'automatica');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_evaluacion as enum ('borrador', 'publicada', 'archivada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_intento as enum ('no_iniciado', 'en_curso', 'entregado', 'expirado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_agrupacion_resultado as enum ('eje', 'contenido', 'capacidad', 'dificultad');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- TABLAS
-- ---------------------------------------------------------------------

create table if not exists instituciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

-- perfiles.id: id del usuario en Supabase Auth (proyecto nuevo, solo Auth).
-- Sin FK ni default: la aplicación lo inserta explícitamente al crear el
-- usuario. Es el único punto de enlace entre Supabase Auth y Neon.
create table if not exists perfiles (
  id uuid primary key,
  institucion_id uuid references instituciones (id) on delete set null,
  rol rol_usuario not null default 'estudiante',
  nombre text not null,
  apellido text not null,
  email text not null unique,
  activo boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cursos (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid references instituciones (id) on delete set null,
  nombre text not null,
  division text not null,
  anio_lectivo int not null,
  docente_titular_id uuid references perfiles (id) on delete set null,
  activo boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists curso_integrantes (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references cursos (id) on delete cascade,
  perfil_id uuid not null references perfiles (id) on delete cascade,
  rol_en_curso text not null check (rol_en_curso in ('docente', 'estudiante')),
  created_at timestamptz not null default now(),
  unique (curso_id, perfil_id)
);

create table if not exists preguntas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  enunciado text not null,
  recurso_url text,
  recurso_alt text,
  opcion_a text not null,
  opcion_b text not null,
  opcion_c text not null,
  opcion_d text not null,
  respuesta_correcta opcion_letra not null,
  explicacion text not null,
  eje eje_matematico not null,
  contenido text not null,
  capacidad capacidad_evaluada not null,
  dificultad nivel_dificultad not null,
  curso_id uuid references cursos (id) on delete set null,
  autor_id uuid references perfiles (id) on delete set null,
  estado estado_pregunta not null default 'borrador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists evaluaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  curso_id uuid not null references cursos (id) on delete cascade,
  tipo tipo_evaluacion not null,
  fecha_apertura timestamptz,
  fecha_cierre timestamptz,
  duracion_minutos int not null check (duracion_minutos > 0),
  cantidad_preguntas int not null check (cantidad_preguntas > 0),
  orden_aleatorio_preguntas boolean not null default true,
  orden_aleatorio_opciones boolean not null default true,
  intentos_max int not null default 1 check (intentos_max > 0),
  puntaje_aprobacion numeric not null default 60 check (puntaje_aprobacion between 0 and 100),
  mostrar_resultado_inmediato boolean not null default true,
  permitir_revision boolean not null default true,
  mostrar_resoluciones boolean not null default true,
  permitir_calculadora boolean not null default false,
  permitir_hoja_formulas boolean not null default false,
  descuento_por_incorrecta boolean not null default false,
  config_automatica jsonb,
  estado estado_evaluacion not null default 'borrador',
  creado_por uuid references perfiles (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists evaluacion_preguntas (
  id uuid primary key default gen_random_uuid(),
  evaluacion_id uuid not null references evaluaciones (id) on delete cascade,
  pregunta_id uuid not null references preguntas (id) on delete cascade,
  orden int not null,
  unique (evaluacion_id, pregunta_id)
);

create table if not exists asignaciones (
  id uuid primary key default gen_random_uuid(),
  evaluacion_id uuid not null references evaluaciones (id) on delete cascade,
  curso_id uuid not null references cursos (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (evaluacion_id, curso_id)
);

create table if not exists intentos (
  id uuid primary key default gen_random_uuid(),
  evaluacion_id uuid not null references evaluaciones (id) on delete cascade,
  estudiante_id uuid not null references perfiles (id) on delete cascade,
  numero_intento int not null,
  estado estado_intento not null default 'no_iniciado',
  fecha_inicio timestamptz,
  fecha_entrega timestamptz,
  tiempo_limite_segundos int not null,
  tiempo_utilizado_segundos int,
  puntaje_obtenido numeric,
  porcentaje_obtenido numeric,
  correctas int,
  incorrectas int,
  sin_responder int,
  aprobado boolean,
  created_at timestamptz not null default now(),
  unique (evaluacion_id, estudiante_id, numero_intento)
);

create table if not exists intento_preguntas (
  id uuid primary key default gen_random_uuid(),
  intento_id uuid not null references intentos (id) on delete cascade,
  pregunta_id uuid not null references preguntas (id) on delete cascade,
  orden int not null,
  enunciado text not null,
  recurso_url text,
  recurso_alt text,
  opciones jsonb not null,
  respuesta_correcta opcion_letra not null,
  explicacion text not null,
  eje eje_matematico not null,
  contenido text not null,
  capacidad capacidad_evaluada not null,
  dificultad nivel_dificultad not null,
  unique (intento_id, pregunta_id)
);

create table if not exists respuestas_estudiante (
  id uuid primary key default gen_random_uuid(),
  intento_id uuid not null references intentos (id) on delete cascade,
  pregunta_id uuid not null references preguntas (id) on delete cascade,
  opcion_seleccionada opcion_letra,
  marcada_para_revisar boolean not null default false,
  respondida_en timestamptz,
  unique (intento_id, pregunta_id)
);

create table if not exists resultado_desglose (
  id uuid primary key default gen_random_uuid(),
  intento_id uuid not null references intentos (id) on delete cascade,
  tipo_agrupacion tipo_agrupacion_resultado not null,
  clave text not null,
  correctas int not null,
  total int not null,
  porcentaje numeric not null
);

create table if not exists configuraciones (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid references instituciones (id) on delete cascade,
  clave text not null,
  valor jsonb not null,
  unique (institucion_id, clave)
);

-- auditoria_admin: registro de acciones administrativas sensibles
-- (eliminaciones, limpiezas de historial, archivado de preguntas, etc).
-- No guarda contraseñas, tokens ni respuestas correctas.
create table if not exists auditoria_admin (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references perfiles (id) on delete set null,
  admin_email text not null,
  accion text not null,
  tabla_afectada text not null,
  registro_id uuid,
  cantidad_registros int not null default 1,
  detalle jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------
create index if not exists idx_perfiles_rol on perfiles (rol);
create index if not exists idx_perfiles_is_demo on perfiles (is_demo);
create index if not exists idx_cursos_institucion on cursos (institucion_id);
create index if not exists idx_cursos_is_demo on cursos (is_demo);
create index if not exists idx_curso_integrantes_curso on curso_integrantes (curso_id);
create index if not exists idx_curso_integrantes_perfil on curso_integrantes (perfil_id);
create index if not exists idx_preguntas_eje on preguntas (eje);
create index if not exists idx_preguntas_contenido on preguntas (contenido);
create index if not exists idx_preguntas_capacidad on preguntas (capacidad);
create index if not exists idx_preguntas_dificultad on preguntas (dificultad);
create index if not exists idx_preguntas_estado on preguntas (estado);
create index if not exists idx_preguntas_autor on preguntas (autor_id);
create index if not exists idx_evaluaciones_curso on evaluaciones (curso_id);
create index if not exists idx_evaluaciones_estado on evaluaciones (estado);
create index if not exists idx_evaluaciones_is_demo on evaluaciones (is_demo);
create index if not exists idx_evaluacion_preguntas_evaluacion on evaluacion_preguntas (evaluacion_id);
create index if not exists idx_asignaciones_curso on asignaciones (curso_id);
create index if not exists idx_asignaciones_evaluacion on asignaciones (evaluacion_id);
create index if not exists idx_intentos_evaluacion on intentos (evaluacion_id);
create index if not exists idx_intentos_estudiante on intentos (estudiante_id);
create index if not exists idx_intentos_estado on intentos (estado);
create index if not exists idx_intento_preguntas_intento on intento_preguntas (intento_id);
create index if not exists idx_respuestas_intento on respuestas_estudiante (intento_id);
create index if not exists idx_resultado_desglose_intento on resultado_desglose (intento_id);
create index if not exists idx_resultado_desglose_tipo on resultado_desglose (tipo_agrupacion, clave);
create index if not exists idx_auditoria_admin_created on auditoria_admin (created_at desc);
create index if not exists idx_auditoria_admin_admin on auditoria_admin (admin_id);

-- ---------------------------------------------------------------------
-- FUNCIONES AUXILIARES (SECURITY DEFINER para evitar recursión de RLS)
-- ---------------------------------------------------------------------

-- Lee el usuario autenticado actual desde la variable de sesión que la
-- capa de datos del servidor fija con `SET LOCAL app.usuario_id = '<uuid>'`
-- al abrir cada conexión/transacción, tras validar la sesión de Supabase
-- Auth. Reemplaza a auth.uid() (que no existe fuera de Supabase).
create or replace function public.usuario_actual_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.usuario_id', true), '')::uuid;
$$;

create or replace function public.mi_rol()
returns rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from perfiles where id = usuario_actual_id();
$$;

create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select rol = 'admin' from perfiles where id = usuario_actual_id()), false);
$$;

create or replace function public.es_docente_de_curso(p_curso_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from cursos c
    where c.id = p_curso_id and c.docente_titular_id = usuario_actual_id()
  ) or exists (
    select 1 from curso_integrantes ci
    where ci.curso_id = p_curso_id and ci.perfil_id = usuario_actual_id() and ci.rol_en_curso = 'docente'
  );
$$;

create or replace function public.es_estudiante_de_curso(p_curso_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from curso_integrantes ci
    where ci.curso_id = p_curso_id and ci.perfil_id = usuario_actual_id() and ci.rol_en_curso = 'estudiante'
  );
$$;

-- No hay trigger de alta de usuario (como `on_auth_user_created` en el
-- proyecto original): no es posible un trigger de Postgres entre dos
-- bases distintas. El alta de `perfiles` la hace explícitamente la
-- aplicación (src/lib/db/usuarios.ts) en el mismo flujo que crea el
-- usuario en Supabase Auth, con reversión si un paso falla.

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table instituciones enable row level security;
alter table perfiles enable row level security;
alter table cursos enable row level security;
alter table curso_integrantes enable row level security;
alter table preguntas enable row level security;
alter table evaluaciones enable row level security;
alter table evaluacion_preguntas enable row level security;
alter table asignaciones enable row level security;
alter table intentos enable row level security;
alter table intento_preguntas enable row level security;
alter table respuestas_estudiante enable row level security;
alter table resultado_desglose enable row level security;
alter table configuraciones enable row level security;
alter table auditoria_admin enable row level security;

-- Deliberadamente SIN "FORCE ROW LEVEL SECURITY": el rol administrador de
-- Neon (dueño del esquema, usado solo por scripts/apply-migrations.mjs y
-- scripts/crear-primer-admin.mjs) necesita poder saltear RLS para el alta
-- del primer administrador (no puede existir todavía una sesión "admin"
-- que la política exija) y para tareas de mantenimiento puntuales. El rol
-- de runtime de la app (app_runtime, ver 0002_rol_runtime.sql) NO es el
-- propietario de las tablas, así que de todos modos queda sujeto a RLS
-- sin necesidad de FORCE: ese rol nunca se usa para el alta inicial.

-- instituciones
drop policy if exists instituciones_select on instituciones;
create policy instituciones_select on instituciones for select using (true);
drop policy if exists instituciones_admin_all on instituciones;
create policy instituciones_admin_all on instituciones for all using (es_admin()) with check (es_admin());

-- perfiles (estado final: ve su propio perfil, admin, o el docente
-- titular/asociado de un curso en común con ese perfil)
drop policy if exists perfiles_select on perfiles;
create policy perfiles_select on perfiles for select using (
  id = usuario_actual_id()
  or es_admin()
  or exists (
    select 1 from curso_integrantes ci
    where ci.perfil_id = perfiles.id and es_docente_de_curso(ci.curso_id)
  )
);
drop policy if exists perfiles_admin_write on perfiles;
create policy perfiles_admin_write on perfiles for all using (es_admin()) with check (es_admin());
drop policy if exists perfiles_propio_update on perfiles;
create policy perfiles_propio_update on perfiles for update using (id = usuario_actual_id()) with check (id = usuario_actual_id());

-- cursos
drop policy if exists cursos_select on cursos;
create policy cursos_select on cursos for select using (
  es_admin() or es_docente_de_curso(id) or es_estudiante_de_curso(id)
);
drop policy if exists cursos_write on cursos;
create policy cursos_write on cursos for all using (
  es_admin() or docente_titular_id = usuario_actual_id()
) with check (
  es_admin() or docente_titular_id = usuario_actual_id()
);

-- curso_integrantes
drop policy if exists curso_integrantes_select on curso_integrantes;
create policy curso_integrantes_select on curso_integrantes for select using (
  es_admin() or es_docente_de_curso(curso_id) or perfil_id = usuario_actual_id()
);
drop policy if exists curso_integrantes_write on curso_integrantes;
create policy curso_integrantes_write on curso_integrantes for all using (
  es_admin() or es_docente_de_curso(curso_id)
) with check (
  es_admin() or es_docente_de_curso(curso_id)
);

-- preguntas (estado final: banco compartido entre docentes; los
-- estudiantes NUNCA acceden a esta tabla directamente; DELETE solo admin)
drop policy if exists preguntas_select on preguntas;
drop policy if exists preguntas_write on preguntas;
drop policy if exists preguntas_insert on preguntas;
drop policy if exists preguntas_update on preguntas;
drop policy if exists preguntas_delete on preguntas;

create policy preguntas_select on preguntas for select using (
  mi_rol() in ('docente', 'admin')
);
create policy preguntas_insert on preguntas for insert with check (
  es_admin() or (mi_rol() = 'docente' and autor_id = usuario_actual_id())
);
create policy preguntas_update on preguntas for update using (
  mi_rol() in ('docente', 'admin')
) with check (
  mi_rol() in ('docente', 'admin')
);
create policy preguntas_delete on preguntas for delete using (es_admin());

-- evaluaciones (estado final: contempla curso de origen + asignaciones)
drop policy if exists evaluaciones_select on evaluaciones;
create policy evaluaciones_select on evaluaciones for select using (
  es_admin()
  or es_docente_de_curso(curso_id)
  or es_estudiante_de_curso(curso_id)
  or exists (
    select 1 from asignaciones a
    where a.evaluacion_id = evaluaciones.id and es_estudiante_de_curso(a.curso_id)
  )
);
drop policy if exists evaluaciones_write on evaluaciones;
create policy evaluaciones_write on evaluaciones for all using (
  es_admin() or es_docente_de_curso(curso_id)
) with check (
  es_admin() or es_docente_de_curso(curso_id)
);

-- evaluacion_preguntas (solo staff; el estudiante nunca lee esto directo)
drop policy if exists evaluacion_preguntas_staff on evaluacion_preguntas;
create policy evaluacion_preguntas_staff on evaluacion_preguntas for all using (
  es_admin() or exists (
    select 1 from evaluaciones e where e.id = evaluacion_id and es_docente_de_curso(e.curso_id)
  )
) with check (
  es_admin() or exists (
    select 1 from evaluaciones e where e.id = evaluacion_id and es_docente_de_curso(e.curso_id)
  )
);

-- asignaciones
drop policy if exists asignaciones_select on asignaciones;
create policy asignaciones_select on asignaciones for select using (
  es_admin() or es_docente_de_curso(curso_id) or es_estudiante_de_curso(curso_id)
);
drop policy if exists asignaciones_write on asignaciones;
create policy asignaciones_write on asignaciones for all using (
  es_admin() or es_docente_de_curso(curso_id)
) with check (
  es_admin() or es_docente_de_curso(curso_id)
);

-- intentos
drop policy if exists intentos_select on intentos;
create policy intentos_select on intentos for select using (
  es_admin() or estudiante_id = usuario_actual_id() or exists (
    select 1 from evaluaciones e where e.id = evaluacion_id and es_docente_de_curso(e.curso_id)
  )
);
drop policy if exists intentos_estudiante_write on intentos;
create policy intentos_estudiante_write on intentos for all using (
  es_admin() or estudiante_id = usuario_actual_id()
) with check (
  es_admin() or estudiante_id = usuario_actual_id()
);

-- intento_preguntas (contiene la respuesta correcta: SOLO staff vía
-- SELECT; el estudiante lee las preguntas de su intento exclusivamente a
-- través de Route Handlers server-side que filtran `respuesta_correcta`
-- antes de responder. El INSERT del snapshot ocurre cuando el propio
-- estudiante inicia su intento -ya no hay "service role" que lo bypasee-
-- por eso hay una política de insert explícita atada a su propio intento)
drop policy if exists intento_preguntas_staff on intento_preguntas;
create policy intento_preguntas_staff on intento_preguntas for select using (
  es_admin() or exists (
    select 1 from intentos i
    join evaluaciones e on e.id = i.evaluacion_id
    where i.id = intento_id and es_docente_de_curso(e.curso_id)
  )
);
drop policy if exists intento_preguntas_insert on intento_preguntas;
create policy intento_preguntas_insert on intento_preguntas for insert with check (
  es_admin() or exists (
    select 1 from intentos i
    where i.id = intento_id and i.estudiante_id = usuario_actual_id()
  )
);

-- respuestas_estudiante
drop policy if exists respuestas_select on respuestas_estudiante;
create policy respuestas_select on respuestas_estudiante for select using (
  es_admin()
  or exists (select 1 from intentos i where i.id = intento_id and i.estudiante_id = usuario_actual_id())
  or exists (
    select 1 from intentos i join evaluaciones e on e.id = i.evaluacion_id
    where i.id = intento_id and es_docente_de_curso(e.curso_id)
  )
);
drop policy if exists respuestas_write on respuestas_estudiante;
create policy respuestas_write on respuestas_estudiante for all using (
  es_admin() or exists (
    select 1 from intentos i
    where i.id = intento_id and i.estudiante_id = usuario_actual_id() and i.estado = 'en_curso'
  )
) with check (
  es_admin() or exists (
    select 1 from intentos i
    where i.id = intento_id and i.estudiante_id = usuario_actual_id() and i.estado = 'en_curso'
  )
);

-- resultado_desglose (SELECT como en el original; el INSERT ocurre al
-- corregir el propio intento del estudiante -antes lo hacía el service
-- role-, de ahí la política de insert explícita)
drop policy if exists resultado_desglose_select on resultado_desglose;
create policy resultado_desglose_select on resultado_desglose for select using (
  es_admin()
  or exists (select 1 from intentos i where i.id = intento_id and i.estudiante_id = usuario_actual_id())
  or exists (
    select 1 from intentos i join evaluaciones e on e.id = i.evaluacion_id
    where i.id = intento_id and es_docente_de_curso(e.curso_id)
  )
);
drop policy if exists resultado_desglose_insert on resultado_desglose;
create policy resultado_desglose_insert on resultado_desglose for insert with check (
  es_admin() or exists (
    select 1 from intentos i where i.id = intento_id and i.estudiante_id = usuario_actual_id()
  )
);

-- configuraciones
drop policy if exists configuraciones_select on configuraciones;
create policy configuraciones_select on configuraciones for select using (true);
drop policy if exists configuraciones_admin_write on configuraciones;
create policy configuraciones_admin_write on configuraciones for all using (es_admin()) with check (es_admin());

-- auditoria_admin (solo lectura admin; el insert ya no lo hace un
-- "service role" que bypasea RLS, así que hace falta una política
-- explícita: solo un admin puede dejar su propio registro de auditoría)
drop policy if exists auditoria_admin_select on auditoria_admin;
create policy auditoria_admin_select on auditoria_admin for select using (es_admin());
drop policy if exists auditoria_admin_insert on auditoria_admin;
create policy auditoria_admin_insert on auditoria_admin for insert with check (es_admin());
