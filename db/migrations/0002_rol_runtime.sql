-- =====================================================================
-- 0002: permisos del rol de runtime de la aplicación (app_runtime)
-- =====================================================================
-- Prerrequisito manual (fuera de SQL, una sola vez): crear el rol
-- "app_runtime" desde el panel de Neon (Project → Roles → Add role).
-- Neon genera su propia connection string/contraseña para ese rol — no
-- se escribe ninguna contraseña en este archivo ni en el repositorio.
-- Ese connection string es el que va en DATABASE_URL (runtime). El
-- connection string del rol propietario del proyecto (el que ya existe
-- por defecto en Neon) va en DATABASE_URL_ADMIN y se usa SOLO para
-- correr migraciones (scripts/apply-migrations.mjs), nunca en runtime.
--
-- Este script es idempotente: si "app_runtime" todavía no existe, no
-- falla, solo avisa con RAISE NOTICE; se puede re-ejecutar después de
-- crear el rol.

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'app_runtime') then
    grant usage on schema public to app_runtime;
    grant select, insert, update, delete on all tables in schema public to app_runtime;
    grant usage, select on all sequences in schema public to app_runtime;
    grant execute on all functions in schema public to app_runtime;
    alter default privileges in schema public
      grant select, insert, update, delete on tables to app_runtime;
    alter default privileges in schema public
      grant execute on functions to app_runtime;
  else
    raise notice 'El rol "app_runtime" todavia no existe en este proyecto de Neon. Creala desde el panel de Neon (Project -> Roles -> Add role) y volve a correr esta migracion (es idempotente).';
  end if;
end $$;
