-- =====================================================================
-- 0003: funciones de conteo exacto de uso de una pregunta
-- =====================================================================
-- El aviso "esta pregunta se usa en N evaluaciones / M intentos" (banco de
-- preguntas) necesita un conteo EXACTO, global a todo el banco compartido,
-- sin exponer el contenido de evaluaciones/intentos de cursos ajenos.
--
-- En el proyecto original esto se resolvía con el cliente de service role
-- de Supabase (bypasea RLS, pero solo se pedía un `count`, nunca filas). En
-- Neon no hay un rol "service" en runtime, así que se logra lo mismo con
-- dos funciones SECURITY DEFINER que devuelven ÚNICAMENTE un número — no
-- ensanchan ninguna política RLS de `evaluacion_preguntas`/`intento_preguntas`
-- (esas tablas siguen protegidas por curso, con su contenido completo).

create or replace function public.contar_uso_pregunta_evaluaciones(p_pregunta_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from evaluacion_preguntas where pregunta_id = p_pregunta_id;
$$;

create or replace function public.contar_uso_pregunta_intentos(p_pregunta_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from intento_preguntas where pregunta_id = p_pregunta_id;
$$;

-- Usada además por el resumen de impacto antes de eliminar una pregunta
-- (obtenerResumenEliminacionPregunta): necesita el conteo exacto de
-- respuestas_estudiante vinculadas, cruzando todos los cursos.
create or replace function public.contar_respuestas_vinculadas_pregunta(p_pregunta_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from respuestas_estudiante where pregunta_id = p_pregunta_id;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'app_runtime2') then
    grant execute on function public.contar_uso_pregunta_evaluaciones(uuid) to app_runtime2;
    grant execute on function public.contar_uso_pregunta_intentos(uuid) to app_runtime2;
    grant execute on function public.contar_respuestas_vinculadas_pregunta(uuid) to app_runtime2;
  else
    raise notice 'El rol "app_runtime2" todavia no existe; volve a correr esta migracion despues de crearlo (ver 0002_rol_runtime.sql).';
  end if;
end $$;
