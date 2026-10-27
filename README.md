# Simulador Aprender Arte Nuevo — Instituto Arte Nuevo

Simulador educativo **independiente** de evaluaciones de Matemática, con formato similar al de las
Pruebas Aprender, para estudiantes de 6.º año de la escuela secundaria de Argentina. Identidad
visual del Instituto Arte Nuevo (logo en `public/images/logo-arte-nuevo.png`, tokens de color en
`src/app/globals.css`).

> Simulador educativo independiente del Instituto Arte Nuevo. No pertenece ni representa a
> organismos gubernamentales. Todas las actividades son originales.

Este proyecto es una versión **completamente independiente** de `Simulador_Aprender` (Instituto
Santiago Ramón y Cajal): mismo código, componentes, diseño y funcionalidades, pero con una base de
datos nueva y vacía, repositorio propio e identidad visual propia. No comparte datos, usuarios,
proyecto de Supabase ni proyecto de Neon con el original.

## Índice

1. [Tecnologías](#tecnologías)
2. [Arquitectura de datos](#arquitectura-de-datos)
3. [Instalación](#instalación)
4. [Configurar Supabase (Auth + Storage)](#configurar-supabase-auth--storage)
5. [Configurar Neon (datos de negocio)](#configurar-neon-datos-de-negocio)
6. [Crear el primer administrador](#crear-el-primer-administrador)
7. [Ejecutar el proyecto](#ejecutar-el-proyecto)
8. [Tests](#tests)
9. [Estructura del código](#estructura-del-código)
10. [Roles y funciones](#roles-y-funciones)

## Tecnologías

- **Next.js 16** (App Router) + **TypeScript** estricto
- **Tailwind CSS 4**
- **Neon (Postgres serverless)** + **Drizzle ORM** para todos los datos de negocio
- **Supabase** solo para **Auth** y **Storage** (sin tablas de negocio)
- **Recharts** para gráficos
- **KaTeX** (`react-katex`) para fórmulas matemáticas
- **`@react-pdf/renderer`** y **`exceljs`** para informes en PDF/Excel
- **Vitest** + Testing Library para tests unitarios/integración

## Arquitectura de datos

A diferencia de un proyecto Supabase "todo en uno", acá la autenticación y los datos viven en dos
sistemas distintos:

- **Supabase** (proyecto nuevo, vacío): únicamente `auth.users` (login, recuperación de contraseña)
  y Storage (buckets preparados para uso futuro). Sin tablas de negocio.
- **Neon**: las 13 tablas de negocio (perfiles, cursos, preguntas, evaluaciones, intentos, etc.),
  definidas en `db/migrations/`. `perfiles.id` guarda el mismo uuid que el usuario en Supabase Auth,
  pero **sin FK** entre bases (no es posible cruzando sistemas distintos).
- **RLS en Neon**: como no existe `auth.uid()` fuera de Supabase, las políticas usan
  `current_setting('app.usuario_id', true)` — una variable de sesión que `src/lib/db/contexto.ts`
  fija con `SET LOCAL` en cada transacción, después de validar la sesión de Supabase Auth en el
  servidor (`src/lib/auth.ts`). El rol de runtime (`app_runtime`, ver `db/migrations/0002_rol_runtime.sql`)
  está sujeto a esas políticas; el rol administrador de Neon solo se usa para migraciones.

No hay trigger de alta de usuario entre bases: cuando un admin/docente crea un usuario, la app
primero lo crea en Supabase Auth y recién después inserta su perfil en Neon
(`src/lib/db/usuarios.ts`), revirtiendo el alta en Auth si el segundo paso falla.

## Instalación

Requisitos: Node.js 20+, una cuenta gratuita en [supabase.com](https://supabase.com) y un proyecto
en [neon.tech](https://neon.tech).

```bash
npm install
```

## Configurar Supabase (Auth + Storage)

1. Creá un proyecto **nuevo** en [supabase.com](https://supabase.com/dashboard) (no reutilices el
   del proyecto original).
2. Copiá `.env.example` a `.env.local`: `cp .env.example .env.local`
3. Completá en `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`: **Project Settings → API**.
   - `SUPABASE_SERVICE_ROLE_KEY`: misma pantalla, clave `service_role` (secreta: nunca la subas a un
     repositorio ni la expongas al navegador). Se usa solo para crear/borrar usuarios desde
     Server Actions.

## Configurar Neon (datos de negocio)

1. Creá un proyecto **nuevo** en [neon.tech](https://neon.tech/) (tampoco reutilices el del
   proyecto original).
2. Copiá el connection string del rol por defecto (el "owner" del proyecto) a
   `DATABASE_URL_ADMIN` en `.env.local`.
3. Corré las migraciones (crean toda la estructura: tablas, enums, índices, funciones y políticas
   RLS; cero `INSERT` de datos):

   ```bash
   npm run db:migrate
   ```

4. En el panel de Neon, creá un segundo rol llamado **`app_runtime`** (Project → Roles → Add role).
   Neon genera su propio connection string/contraseña: copialo a `DATABASE_URL` en `.env.local`
   (este es el que usa la app en runtime, sujeto a RLS; nunca el del rol administrador).
5. Volvé a correr `npm run db:migrate` — `0002_rol_runtime.sql` es idempotente y, ahora que el rol
   existe, le otorga los permisos necesarios.

## Crear el primer administrador

Con `.env.local` completo (Supabase + Neon):

```bash
npm run db:crear-admin
```

Pide el email y la contraseña por línea de comandos (no quedan escritos en ningún archivo), crea el
usuario en Supabase Auth y su perfil con rol `admin` en Neon. A partir de ahí, el resto de los
usuarios se crean desde el panel de administración de la propia aplicación.

## Ejecutar el proyecto

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

Para producción:

```bash
npm run build
npm run start
```

## Tests

```bash
npm test          # corre una vez
npm run test:watch
```

Cubren la lógica de corrección automática (`src/lib/scoring.ts`), la selección aleatoria y el
armado de intentos (`src/lib/randomization.ts`), la generación/parseo de CSV y las reglas de
permisos por rol (`src/lib/permisos.ts`). Antes de dar por terminado un cambio, corré también:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Estructura del código

```
db/
  migrations/                 DDL de Neon: tablas, enums, índices, funciones, RLS (sin datos)
scripts/
  apply-migrations.mjs        Aplica db/migrations/ contra DATABASE_URL_ADMIN
  crear-primer-admin.mjs      Alta manual del primer administrador (Auth + perfil en Neon)
src/
  app/
    login/                    Inicio de sesión
    estudiante/                Área del estudiante (rutas protegidas por rol)
    docente/                   Área docente (y admin, para banco/evaluaciones/reportes)
    admin/                     Administración (usuarios, cursos, configuración)
    api/intentos/              Route handlers server-only: rendición y corrección de exámenes
    api/reportes/              Exportación CSV/PDF/Excel
  components/                 Componentes de UI compartidos
  lib/
    db/                        Capa de datos Neon (Drizzle): schema, contexto de sesión/RLS,
                                 un módulo por dominio (cursos, preguntas, evaluaciones, intentos…)
    supabase/                  Clientes de Supabase (browser, server, admin — solo Auth/Storage)
    scoring.ts                  Corrección automática (función pura)
    randomization.ts            Selección aleatoria y barajado (función pura)
    intentos-server.ts          Arma el snapshot de preguntas y corrige intentos (solo servidor)
    permisos.ts                  Reglas de acceso por rol y ruta (función pura)
  proxy.ts                     Protección de rutas por rol (antes "middleware.ts" en Next 16)
tests/unit/                   Tests de Vitest
```

### Cómo se protege la respuesta correcta

Las políticas RLS no pueden ocultar columnas específicas de una fila. Por eso, todo el flujo de
"rendir una evaluación" (iniciar intento, obtener preguntas, autoguardar respuestas, entregar y
corregir) pasa por **Route Handlers** (`src/app/api/intentos/...`) que leen la fila completa de
Neon (incluida `respuesta_correcta`) y arman manualmente la respuesta JSON, quitándola mientras el
intento está `en_curso`. El resto de la aplicación usa la misma capa de datos, siempre dentro de una
transacción con RLS activo para el usuario autenticado.

## Roles y funciones

**Administrador**: usuarios, cursos, banco completo de preguntas, configuración general, todos los
resultados.

**Docente**: banco de preguntas propio (y consulta de las preguntas activas de otros docentes),
evaluaciones manuales o automáticas, asignación a cursos, incorporación de estudiantes, reportes
(CSV/PDF/Excel) filtrados por curso/evaluación.

**Estudiante**: evaluaciones asignadas, rendición cronometrada con guardado automático, marcado de
preguntas para revisar, resultados (cuando el/la docente los habilita), revisión de respuestas con
resolución paso a paso, historial de intentos.

## Configuraciones externas pendientes (a completar por vos)

- Crear el proyecto en Supabase y el proyecto en Neon, y completar `.env.local` (ver arriba).
- Correr `npm run db:migrate` (dos veces: antes y después de crear el rol `app_runtime` en Neon).
- Correr `npm run db:crear-admin` para tener el primer usuario administrador.
- Si vas a desplegar en producción, configurar las mismas variables de entorno en tu hosting (por
  ejemplo Vercel) y restringir la URL de callback de Auth en Supabase a tu dominio real.
