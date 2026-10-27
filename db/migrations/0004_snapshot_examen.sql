-- =====================================================================
-- 0004: funciones de armado del snapshot de examen + ajuste de RLS
-- =====================================================================
-- Al iniciar un intento, el servidor arma una copia inmutable de las
-- preguntas (intento_preguntas) leyendo el banco completo (automática) o
-- las preguntas de la evaluación (manual) — ambas lecturas necesitan
-- contenido COMPLETO de `preguntas` (incluida `respuesta_correcta`),
-- aunque quien dispara la acción sea un estudiante, que normalmente no
-- tiene ningún acceso de lectura a `preguntas` ni a `evaluacion_preguntas`.
--
-- En el proyecto original esto se resolvía con el cliente de service role
-- (bypasea RLS). En Neon, como no hay un rol "service" en runtime, se
-- logra lo mismo con dos funciones SECURITY DEFINER de alcance acotado:
-- devuelven filas de `preguntas`, pero SOLO a través de las rutas exactas
-- que usa el armado del snapshot (jamás vía una query arbitraria del
-- cliente, que no existe: Neon nunca se expone al navegador).

create or replace function public.preguntas_activas_para_snapshot()
returns setof preguntas
language sql
stable
security definer
set search_path = public
as $$
  select * from preguntas where estado = 'activa';
$$;

create or replace function public.preguntas_de_evaluacion_para_snapshot(p_evaluacion_id uuid)
returns table (
  orden int,
  id uuid,
  codigo text,
  enunciado text,
  recurso_url text,
  recurso_alt text,
  opcion_a text,
  opcion_b text,
  opcion_c text,
  opcion_d text,
  respuesta_correcta opcion_letra,
  explicacion text,
  eje eje_matematico,
  contenido text,
  capacidad capacidad_evaluada,
  dificultad nivel_dificultad,
  curso_id uuid,
  autor_id uuid,
  estado estado_pregunta,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select ep.orden, p.*
  from evaluacion_preguntas ep
  join preguntas p on p.id = ep.pregunta_id
  where ep.evaluacion_id = p_evaluacion_id
  order by ep.orden;
$$;

-- El estudiante lee sus propias intento_preguntas (ya filtradas de
-- respuesta_correcta por la app antes de responder al navegador — ver
-- aPreguntasPublicas en src/lib/intentos-server.ts) para ver su examen en
-- curso. La política original solo dejaba verlas a "staff" (docente del
-- curso / admin); se agrega una política más para el propio estudiante.
drop policy if exists intento_preguntas_select_propio on intento_preguntas;
create policy intento_preguntas_select_propio on intento_preguntas for select using (
  exists (
    select 1 from intentos i where i.id = intento_id and i.estudiante_id = usuario_actual_id()
  )
);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'app_runtime') then
    grant execute on function public.preguntas_activas_para_snapshot() to app_runtime;
    grant execute on function public.preguntas_de_evaluacion_para_snapshot(uuid) to app_runtime;
  else
    raise notice 'El rol "app_runtime" todavia no existe; volve a correr esta migracion despues de crearlo (ver 0002_rol_runtime.sql).';
  end if;
end $$;
