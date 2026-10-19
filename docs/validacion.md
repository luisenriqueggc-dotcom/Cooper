# Validación · 19 de octubre de 2026

## Ejecutado

- `npm run check`: correcto. Verificación TypeScript estricta, 4 pruebas y build de Next.js 16.4.2.
- PostgreSQL embebido PGlite: migración completa ejecutada con roles `authenticated`/`anon` y sustitutos mínimos de `auth.uid`, usuarios y Storage.
- Prueba de base de datos: creación, asignación, actualización, historial automático, confirmación repetida sin duplicado, rechazo de versión obsoleta, rollback ante responsable inexistente, separación de chats entre admins, cuota compartida de 10 peticiones y rechazo de privilegios para viewer/inactivo/anónimo.
- Validaciones de dominio: fechas inexistentes, campos de privilegios no permitidos, vencimientos y origen HTTP exacto.
- `npm install` tras actualizar Next.js: auditoría reportó 0 vulnerabilidades conocidas en el lockfile de esta entrega. No representa garantía futura.
- HTTP local: `/`, `/demo`, `/login` devuelven 200; `/admin` y `/board` redirigen a login sin configuración; las tres APIs de tareas/acciones/chat rechazan origen ajeno con 403.
- Revisión en navegador: dashboard y chat visibles, creación de tarea de demostración con responsable y contexto, actualización del conteo, búsqueda, cambio a vista de consulta y detalle con campos deshabilitados y sin botón Guardar. Demo reiniciada tras la prueba.
- Capturas en `docs/preview/`. La del tablero contiene la tarea ficticia creada durante la validación.

El compilador Turbopack no pudo abrir su puerto interno en el entorno de trabajo. Se configuró webpack explícitamente y la compilación completa pasó; no hay un error de build pendiente.

## No ejecutado por falta de configuración externa

- Inicio de sesión contra Supabase alojado.
- Llamada real a OpenAI y evaluación de propuestas en español.
- Carga de archivos (interfaz todavía pendiente).
- Publicación/remoto GitHub y despliegue Vercel.
- Auditoría de accesibilidad completa, pruebas automáticas de navegador o revisión visual exhaustiva móvil.

## Piloto conectado recomendado

1. Aplicar migración en Supabase de pruebas, crear admin y viewer.
2. Crear una tarea manual; comprobar responsables, solicitante, fecha y contexto.
3. Pedir al chat “Pon la tarea X en proceso”; revisar propuesta y confirmar.
4. Repetir confirmación; verificar que no se duplica el cambio.
5. Proponer un cambio y editar antes la misma tarea desde otra sesión admin; confirmar que la propuesta antigua falla.
6. Iniciar sesión como viewer: solo tablero y detalle; POST a endpoints de edición devuelve 403.
7. Desactivar viewer y comprobar pérdida de acceso.
8. Verificar que otro admin no puede leer un chat ajeno ni aplicar su propuesta.

La base está preparada para un piloto; comentarios/archivos, administración de usuarios, recuperación de contraseña y visor de historial necesitan UI antes de una operación completa.
