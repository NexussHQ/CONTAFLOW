# MIGRACIÓN DE SUPABASE A APPWRITE

## Resumen

Este documento describe cómo migrar CONTAFLOW de Supabase a Appwrite.

---

## 1. COLECCIONES A CREAR EN APPWRITE

### 1.1 Colección: `profiles`
| Atributo | Tipo | Requerido | Descripción |
|----------|------|-----------|-------------|
| id | string (UUID) | Sí | ID del usuario (relacionado con auth) |
| full_name | string | No | Nombre completo |
| avatar_url | string | No | URL del avatar |
| company_name | string | No | Nombre de empresa |
| created_at | datetime | Sí | Fecha de creación |
| updated_at | datetime | Sí | Fecha de última actualización |

**Permisos:**
- Lectura: `read("user:[USER_ID]")`
- Escritura: `update("user:[USER_ID]")`

---

### 1.2 Colección: `fichas`
| Atributo | Tipo | Requerido | Descripción |
|----------|------|-----------|-------------|
| id | string (UUID) | Sí | ID único |
| user_id | string (UUID) | Sí | Propietario |
| tipo | string (enum) | Sí | 'prospecto' o 'cliente' |
| nombre | string | Sí | Nombre del contacto |
| ruc | string | No | RUC (13 dígitos Ecuador) |
| telefono | string | No | Teléfono |
| email | string | No | Email |
| relacion | string (enum) | Sí | 'lead', 'cliente', 'socio', 'colega' |
| campos_personalizados | string (JSON) | Sí | Campos personalizados (JSON) |
| etapa_ventas | string | No | Etapa actual en ventas |
| etapa_postventa | string | No | Etapa actual en postventa |
| creado_at | datetime | Sí | Fecha de creación |
| actualizado_at | datetime | Sí | Fecha de actualización |

**Permisos:**
- Lectura: `read("user:[USER_ID]")`
- Creación: `create("user:[USER_ID]")`
- Actualización: `update("user:[USER_ID]")`
- Eliminación: `delete("user:[USER_ID]")`

---

### 1.3 Colección: `tasks`
| Atributo | Tipo | Requerido | Descripción |
|----------|------|-----------|-------------|
| id | string (UUID) | Sí | ID único |
| user_id | string (UUID) | Sí | Propietario |
| ficha_id | string (UUID) | No | Ficha relacionada |
| title | string | Sí | Título de la tarea |
| description | string | No | Descripción |
| priority | string (enum) | Sí | 'high' o 'normal' |
| status | string (enum) | Sí | 'pending' o 'completed' |
| due_date | string (date) | No | Fecha de vencimiento |
| due_time | string (time) | No | Hora de vencimiento |
| created_at | datetime | Sí | Fecha de creación |
| completed_at | datetime | No | Fecha de completada |

**Permisos:**
- Lectura: `read("user:[USER_ID]")`
- Creación: `create("user:[USER_ID]")`
- Actualización: `update("user:[USER_ID]")`
- Eliminación: `delete("user:[USER_ID]")`

---

### 1.4 Colección: `subtasks`
| Atributo | Tipo | Requerido | Descripción |
|----------|------|-----------|-------------|
| id | string (UUID) | Sí | ID único |
| task_id | string (UUID) | Sí | Tarea padre |
| title | string | Sí | Título |
| description | string | No | Descripción |
| completed | boolean | Sí | Completada |
| order_index | integer | Sí | Orden |
| created_at | datetime | Sí | Fecha de creación |
| completed_at | datetime | No | Fecha de completada |

**Permisos:**
- Lectura: `read("user:[USER_ID]")` (a través de la tarea padre)
- Creación: `create("user:[USER_ID]")`
- Actualización: `update("user:[USER_ID]")`
- Eliminación: `delete("user:[USER_ID]")`

---

### 1.5 Colección: `timeline`
| Atributo | Tipo | Requerido | Descripción |
|----------|------|-----------|-------------|
| id | string (UUID) | Sí | ID único |
| ficha_id | string (UUID) | Sí | Ficha relacionada |
| user_id | string (UUID) | Sí | Usuario que creó |
| tipo | string (enum) | Sí | 'nota', 'llamada', 'email', 'reunion', 'tarea', 'sistema' |
| titulo | string | No | Título |
| contenido | string | No | Contenido |
| fecha | datetime | Sí | Fecha del evento |

**Permisos:**
- Lectura: `read("user:[USER_ID]")`
- Creación: `create("user:[USER_ID]")`
- Actualización: `update("user:[USER_ID]")`
- Eliminación: `delete("user:[USER_ID]")`

---

### 1.6 Colección: `kanban_columns`
| Atributo | Tipo | Requerido | Descripción |
|----------|------|-----------|-------------|
| id | string (UUID) | Sí | ID único |
| user_id | string (UUID) | Sí | Propietario |
| tipo | string (enum) | Sí | 'ventas' o 'postventa' |
| nombre | string | Sí | Nombre de la columna |
| posicion | integer | Sí | Orden |
| color | string | Sí | Color hex |

**Permisos:**
- Lectura: `read("user:[USER_ID]")`
- Creación: `create("user:[USER_ID]")`
- Actualización: `update("user:[USER_ID]")`
- Eliminación: `delete("user:[USER_ID]")`

---

### 1.7 Colección: `etiquetas`
| Atributo | Tipo | Requerido | Descripción |
|----------|------|-----------|-------------|
| id | string (UUID) | Sí | ID único |
| user_id | string (UUID) | Sí | Propietario |
| nombre | string | Sí | Nombre de la etiqueta |
| color | string | Sí | Color hex |

**Permisos:**
- Lectura: `read("user:[USER_ID]")`
- Creación: `create("user:[USER_ID]")`
- Actualización: `update("user:[USER_ID]")`
- Eliminación: `delete("user:[USER_ID]")`

---

### 1.8 Colección: `ficha_etiquetas`
| Atributo | Tipo | Requerido | Descripción |
|----------|------|-----------|-------------|
| id | string (UUID) | Sí | ID único |
| ficha_id | string (UUID) | Sí | Ficha relacionada |
| etiqueta_id | string (UUID) | Sí | Etiqueta relacionada |

**Permisos:**
- Lectura: `read("user:[USER_ID]")`
- Creación: `create("user:[USER_ID]")`
- Eliminación: `delete("user:[USER_ID]")`

---

### 1.9 Colección: `custom_fields`
| Atributo | Tipo | Requerido | Descripción |
|----------|------|-----------|-------------|
| id | string (UUID) | Sí | ID único |
| user_id | string (UUID) | Sí | Propietario |
| field_key | string | Sí | Clave del campo |
| field_label | string | Sí | Label visible |
| field_type | string (enum) | Sí | 'text', 'date', 'number', 'select' |
| options | string (JSON) | No | Opciones para select |
| is_required | boolean | Sí | Requerido |
| position | integer | Sí | Orden |
| created_at | datetime | Sí | Fecha de creación |

**Permisos:**
- Lectura: `read("user:[USER_ID]")`
- Creación: `create("user:[USER_ID]")`
- Actualización: `update("user:[USER_ID]")`
- Eliminación: `delete("user:[USER_ID]")`

---

## 2. VARIABLES DE ENTORNO

### Archivo: `.env.local`
```env
# Appwrite
NEXT_PUBLIC_APPWRITE_URL=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=tu-project-id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=tu-database-id
APPWRITE_API_KEY=tu-api-key
```

---

## 3. COMANDOS APPWRITE CLI

### Login
```bash
appwrite login
```

### Crear base de datos
```bash
appwrite databases create \
  --name "Contaflow" \
  --id "unique()" \
  --read "[users]" \
  --write "[users]"
```

### Crear colecciones
```bash
# profiles
appwrite databases create_collection \
  --databaseId "tu-database-id" \
  --name "profiles" \
  --id "profiles" \
  --read "[users]" \
  --write "[users]"

# fichas
appwrite databases create_collection \
  --databaseId "tu-database-id" \
  --name "fichas" \
  --id "fichas" \
  --read "[users]" \
  --write "[users]"
```

---

## 4. MÓDULOS NPM REQUERIDOS

```bash
npm install appwrite
```

---

## 5. ESTRUCTURA DE ARCHIVOS A MODIFICAR

### Archivos creados:
- `src/lib/appwrite/client.ts` ✅
- `src/lib/appwrite/server.ts` ✅

### Archivos a modificar:
- `src/middleware.ts`
- `src/hooks/use-tasks.ts`
- `src/hooks/use-subtasks.ts`
- `src/hooks/use-contacts.ts`
- `src/hooks/use-realtime.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/api/auth/register/route.ts`
- `src/app/api/fichas/route.ts`
- `src/app/dashboard/*/page.tsx`
- `Dockerfile` ✅ (actualizado para Appwrite)
- `.env.local.example` ✅ (actualizado para Appwrite)
