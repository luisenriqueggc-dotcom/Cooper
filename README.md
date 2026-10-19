# Skandia Planner · punto de partida

Aplicación Next.js App Router + TypeScript + Tailwind, PostgreSQL/Supabase y OpenAI Responses API. Una aplicación con administración y consulta. Proyecto independiente del prototipo `skandia-planner` existente.

## Probar ahora, sin credenciales

Requiere Node.js 22 y npm.

```sh
npm ci
npm run dev
```

Abre `http://localhost:3000/demo`. Puedes filtrar tareas, abrir detalles, crear y editar tareas ficticias y cambiar a la vista de consulta. La demo mantiene cambios únicamente en memoria; al recargar se reinician. Su chat está marcado como demostración y no llama a OpenAI. `/login`, `/admin` y `/board` utilizan Supabase real; no existe un acceso administrador de prueba en esas rutas.

## Entregables

- [Modelo de datos y decisiones](docs/modelo.md): entidades, relaciones, valores por defecto y permisos.
- [Wireframes y flujos](docs/wireframes.md): admin con dashboard/chat, tablero de consulta y detalle.
- [Arquitectura y API](docs/arquitectura.md): carpetas, function calling, controles y límites.
- [Configurar Supabase, GitHub y Vercel](docs/despliegue.md).
- [Validación y alcance pendiente](docs/validacion.md).
- Migración ejecutable: `supabase/migrations/202610190001_initial.sql`.

## Qué funciona

| Función                                                       | Estado                                                                        |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Dashboard y tablero con filtros                               | Implementado; demo o lectura desde Supabase                                   |
| Login por correo/contraseña y roles                           | Implementado; requiere aprovisionar usuarios                                  |
| Crear/editar tarea, fechas, contexto y múltiples responsables | Implementado                                                                  |
| IA: buscar, consultar catálogos, proponer altas y cambios     | Implementado; requiere credencial y modelo habilitado                         |
| Confirmación atómica, control de versiones y auditoría        | Implementado en PostgreSQL                                                    |
| Contexto de tarea compartido con viewers                      | Implementado, solo lectura                                                    |
| Comentarios y adjuntos privados                               | Esquema, RLS, bucket y auditoría preparados; interfaz pendiente               |
| Historial de cambios                                          | Persistido por triggers; visor pendiente                                      |
| Chat privado e historial                                      | Persistencia y contexto de 12 mensajes; selector para reabrir chats pendiente |
| GitHub/Vercel                                                 | Archivos y guía preparados; sin repositorio remoto ni despliegue creado       |

## Comprobación

```sh
npm run check
```

Incluye TypeScript, pruebas de reglas y PostgreSQL embebido (PGlite), y compilación de producción. PGlite verifica la migración y RLS con roles reales de PostgreSQL y sustitutos mínimos de Auth/Storage. No reemplaza una prueba de integración contra tu proyecto Supabase ni una llamada real al modelo.

## Configuración segura

Copia `.env.example` a `.env.local` y configura sus valores localmente. En Vercel usa Environment Variables. `OPENAI_API_KEY` nunca lleva prefijo `NEXT_PUBLIC_`; no se necesita `service_role` en la aplicación. No pegues claves en un chat ni las incluyas en Git.

La aplicación consulta la [API Responses con function calling](https://developers.openai.com/api/docs/guides/function-calling): el modelo solicita herramientas y el servidor valida y ejecuta las permitidas. Las propuestas requieren confirmación para modificar tareas. El acceso en base de datos utiliza [Row Level Security de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).
