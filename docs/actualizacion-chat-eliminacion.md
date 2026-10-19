# Chat para reuniones y eliminación de tareas

## Uso

- Desde el celular: abrir `/chat`, iniciar sesión con un administrador y escribir las peticiones. El acceso conserva el destino al iniciar sesión. Las propuestas se revisan y confirman en la misma pantalla; no hace falta abrir el tablero.
- Desde administración: el enlace “Chat para reuniones” abre esa misma vista. “Ver tablero” vuelve al planner.
- Para eliminar: abrir una tarea existente → Eliminar tarea → Sí, eliminar tarea. Solo administradores. La tarea deja de aparecer en tablero, métricas y búsquedas de IA.
- La eliminación es recuperable por el operador de Supabase. No borra físicamente la tarea, sus responsables, comentarios o historial. No hay papelera en la interfaz todavía.
- La IA no elimina tareas en esta actualización: la eliminación se realiza desde el detalle con confirmación explícita.
- Los mensajes y propuestas se guardan como antes, pero todavía no hay selector para reabrir conversaciones después de cerrar/recargar. Las tareas confirmadas sí persisten y se ven al actualizar el planner de escritorio.

## Activación en el proyecto existente

1. Abrir SQL Editor de Supabase.
2. Copiar y ejecutar SOLO `supabase/migrations/202610190002_task_deletion.sql`. No volver a ejecutar la migración inicial.
3. Publicar estos cambios en Vercel. La vista `/chat` puede usarse incluso antes de aplicar la migración; eliminar mostrará un aviso de configuración pendiente hasta aplicarla.
4. Crear una tarea de prueba, eliminarla y recargar. Confirmar que ya no aparece y que su registro permanece con `deleted_at` en Supabase.

No requiere nuevas variables, claves ni cambios en `APP_ORIGIN`.

## Recuperación por el operador de Supabase

Reemplazar el UUID por el de la tarea que se quiere recuperar:

```sql
update public.tasks
set deleted_at = null, deleted_by = null,
    version = version + 1, updated_at = now()
where id = 'UUID-DE-LA-TAREA' and deleted_at is not null;
```

El historial conserva el evento de eliminación y la recuperación. Los clientes de la app no pueden ejecutar esta actualización directamente.

## Validación

TypeScript, build y pruebas PostgreSQL: confirmación de eliminación repetida sin doble evento, rechazo de versión obsoleta, denegación al viewer, invisibilidad por RLS de tarea/asignaciones eliminadas, preservación del historial y bloqueo de propuestas antiguas o manipuladas sobre tareas eliminadas. Recuperación por operador verificada.
