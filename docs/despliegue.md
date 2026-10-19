# Puesta en marcha: Supabase → GitHub → Vercel

No se requieren credenciales para probar `/demo` o ejecutar las pruebas. Para el modo conectado, el titular configura secretos directamente en su entorno y paneles; nunca por chat.

## 1. Supabase

1. Crear un proyecto Supabase para el piloto. Usar un proyecto distinto de producción para pruebas.
2. Ejecutar una sola vez `supabase/migrations/202610190001_initial.sql` en SQL Editor. La migración utiliza Auth y Storage estándar de Supabase. No ejecutarla sobre un esquema que ya tenga tablas con estos nombres.
3. Opcional: ejecutar `supabase/seed.sql` para catálogos de ejemplo o introducir las áreas/líneas reales desde el panel. No carga usuarios ficticios.
4. Deshabilitar registros públicos en Auth. Esta base no incluye registro abierto, invitaciones ni recuperación de contraseña.
5. Crear la primera identidad en Authentication → Users usando correo/contraseña y correo confirmado. El titular introduce su contraseña directamente en el panel, nunca en este chat. Copiar únicamente su UUID al siguiente SQL, reemplazar el nombre y ejecutar como operador de Supabase:

```sql
insert into public.profiles(id, display_name, role, active)
values ('REEMPLAZAR-POR-UUID-DE-AUTH', 'Administrador inicial', 'admin', true);
```

6. Para un usuario de consulta, crear su identidad por el mismo proceso y su perfil con `role='viewer'`, `active=true`. La aplicación no eleva privilegios desde metadata de Auth. Para revocar acceso, actualizar `active=false`; conservar el perfil para mantener el historial.
7. La primera prueba integrada debe usar un admin y un viewer. Los correos y contraseñas no van en el repositorio. Para usuarios finales, completar el flujo de invitación y recuperación antes de ampliar el piloto.

## 2. Variables locales

```sh
cp .env.example .env.local
```

| Variable                               | Dónde obtenerla / valor                                                                 | Exposición                     |
| -------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL del proyecto Supabase                                                               | Pública                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable del proyecto                                                           | Pública; RLS protege los datos |
| `OPENAI_API_KEY`                       | Clave de un proyecto OpenAI con uso habilitado                                          | Solo servidor                  |
| `OPENAI_MODEL`                         | Inicial: `gpt-4.1-mini`, o modelo de Responses habilitado que admita estas herramientas | Solo servidor                  |
| `APP_ORIGIN`                           | `http://localhost:3000` local; origen HTTPS exacto en despliegue                        | Servidor                       |

No agregar `SUPABASE_SERVICE_ROLE_KEY`. La aplicación usa los permisos reales de cada sesión. Si falta OpenAI, el CRUD manual sigue funcionando y el chat muestra un error de configuración. Si falta Supabase, las rutas privadas llevan a login y la demo sigue disponible.

## 3. GitHub

La carpeta ya está inicializada como repositorio Git local en la rama `main`, con archivos preparados para el primer commit, sin remoto. Incluye `.gitignore`, lockfile y GitHub Actions. Elegir un repositorio **privado** llamado, por ejemplo, `skandia-planner`. No subir archivos del proyecto ChatGPT ni el prototipo anterior.

Si se utiliza la carpeta entregada y todavía no es un repositorio:

```sh
git init -b main
git add .
git commit -m "Initial Skandia planner starter"
```

Con un repositorio remoto vacío creado en tu cuenta/organización:

```sh
git remote add origin URL_DEL_REPOSITORIO_PRIVADO
git push -u origin main
```

No existe todavía un remoto conectado por esta entrega. El workflow verifica tipos, pruebas y build sin secretos. Proteger `main` con revisión y checks al activar colaboración. La ubicación del repositorio (cuenta personal u organización) es la única decisión pendiente para publicarlo en GitHub.

## 4. Vercel

1. Importar ese repositorio; framework Next.js, Node 22.x, root directory `.` si el repo contiene solo esta base. Si se usa monorepo, seleccionar `skandia-planner-starter`.
2. Install `npm ci`; build `npm run build`; configuración `vercel.json` incluida. El proyecto utiliza el compilador webpack explícitamente para ser reproducible en este entorno.
3. Configurar las cinco variables desde Environment Variables. Usar un Supabase de desarrollo en Preview y otro de producción en Production.
4. `APP_ORIGIN` debe coincidir exactamente con el origen que abre el usuario; actualizarlo al dominio final y redesplegar. Las URLs alternativas de Vercel no podrán enviar formularios si el origen no coincide. Para previews usar dominio estable o configurar el origen específico de ese despliegue; no permitir comodines.
5. Establecer la Site URL de Supabase Auth al dominio elegido. Este inicio por contraseña no usa callback OAuth; al añadir invitaciones/reset se deben implementar esas rutas y registrar redirects exactos.
6. Verificar el timeout disponible para la función de chat (declara 120 s). El modelo y la red pueden fallar; el usuario recibe error sin que se confirmen cambios automáticamente.
7. Abrir `/login`, crear una tarea manual, usar el chat para preparar una actualización y confirmarla. Verificar con el viewer que no aparezcan dashboard ni chat y que no pueda escribir mediante llamadas directas.

La documentación oficial de [Next.js en Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) describe la integración de despliegue. No se ha creado un proyecto remoto ni publicado datos como parte de esta preparación.

## Lo imprescindible para activar el piloto

- Un proyecto Supabase configurado y un usuario admin activo.
- Una clave OpenAI con acceso al modelo, introducida en variables de entorno.
- La cuenta/organización de GitHub y el proyecto de Vercel donde se alojará.

Los nombres reales de áreas, líneas y participantes pueden cargarse después; no bloquean la demo. El dominio personalizado también es opcional para el primer despliegue.
