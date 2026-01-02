# ✅ GUÍA FINAL: Estructura de Base de Datos para Producción

## 🎯 Tu Situación

### Lo que TIENES:
- ✅ **Archivos de migración** en `supabase/migrations/`
- ✅ **Estructura completa** de la base de datos
- ✅ **Código compatible** con esta estructura
- ✅ **Proyecto funcional** ContaFlow
- ✅ Aplicación lista** para producción

### Lo que NO tienes:
- ❌ **Muchos datos** en la base de datos (porque no estás en producción)
- ❌ Necesidad de respaldar datos (porque hay pocos)
- ❌ Preocupación de perder datos (Porque no hay muchos)

### Lo que NECESITAS:
- ✅ **Solo la estructura** de las tablas
- ✅ Documentación clara de qué hace cada migración
- ✅ Seguridad de que los archivos están completos
- ✅ Instrucciones para usar esta estructura en producción

---

## 📊 Estructura de tu Base de Datos

### Archivos de Migración Disponibles:

#### 1. [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)
**Contenido:**
- Tablas iniciales del sistema
- Estructura básica

#### 2. [`supabase/migrations/002_complete_schema.sql`](supabase/migrations/002_complete_schema.sql)
**Contenido:**
- Estructura completa del sistema
- Incluye todas las tablas principales

#### 3. [`supabase/migrations/003_fix_registration_with_email_confirmation.sql`](supabase/migrations/003_fix_registration_with_email_confirmation.sql)
**Contenido:**
- Corrección de registro con confirmación de email
- Arreglos de seguridad

#### 4. [`supabase/migrations/004_fix_registration_safe.sql`](supabase/migrations/004_fix_registration_safe.sql)
**Contenido:**
- Corrección segura de registro
- Mejoras de seguridad

#### 5. [`supabase/migrations/005_add_subtasks.sql`](supabase/migrations/005_add_subtasks.sql)
**Contenido:**
- Agrega funcionalidad de subtareas
- Nuevas tablas para subtareas

#### 6. [`supabase/migrations/complete_schema_safe.sql`](supabase/migrations/complete_schema_safe.sql) ⭐ **ARCHIVO PRINCIPAL**
**Contenido:**
- ✅ **Todos los archivos anteriores combinados**
- ✅ **Estructura COMPLETA de la base de datos**
- ✅ **Verificación de existencia** (IF NOT EXISTS)
- ✅ **Este es el archivo que debes usar en producción**

---

## 🗄️ Tablas en tu Estructura

### Tabla: `profiles`
**Propósito:** Información de perfil de usuario
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT,
    avatar_url TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### Tabla: `fichas` (Ficha Maestra)
**Propósito:** Datos principales de clientes/prospectos
```sql
CREATE TABLE fichas (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    tipo VARCHAR(20) DEFAULT 'prospecto',
    nombre VARCHAR(200) NOT NULL,
    ruc VARCHAR(13),
    telefono VARCHAR(20),
    email VARCHAR(255),
    relacion VARCHAR(20) DEFAULT 'lead',
    campos_personalizados JSONB DEFAULT '{}',
    etapa_ventas VARCHAR(50),
    etapa_postventa VARCHAR(50),
    creado_at TIMESTAMPTZ,
    actualizado_at TIMESTAMPTZ
);
```

### Tabla: `tasks`
**Propósito:** Tareas y subtareas
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    ficha_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    priority VARCHAR(10) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending',
    due_date DATE,
    due_time TIME,
    created_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);
```

### Tabla: `timeline`
**Propósito:** Historial unificado de fichas
```sql
CREATE TABLE timeline (
    id UUID PRIMARY KEY,
    ficha_id UUID NOT NULL,
    user_id UUID NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(200),
    contenido TEXT,
    fecha TIMESTAMPTZ
);
```

### Tabla: `columnas_kanban`
**Propósito:** Configuración de columnas Kanban por usuario
```sql
CREATE TABLE columnas_kanban (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    posicion INTEGER NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1'
);
```

### Tabla: `custom_field_definitions`
**Propósito:** Definición de campos personalizados
```sql
CREATE TABLE custom_field_definitions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    field_key TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL,
    options JSONB,
    is_required BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ
);
```

### Tabla: `etiquetas_ficha`
**Propósito:** Etiquetas personalizadas
```sql
CREATE TABLE etiquetas_ficha (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL
);
```

### Tabla: `ficha_etiquetas`
**Propósito:** Relación muchos-a-muchos (fichas ↔ etiquetas)
```sql
CREATE TABLE ficha_etiquetas (
    ficha_id UUID NOT NULL,
    etiqueta_id UUID NOT NULL,
    PRIMARY KEY (ficha_id, etiqueta_id)
);
```

---

## 🔒 Seguridad (Row Level Security)

### Políticas Habilitadas:
Todas las tablas tienen RLS habilitado:

```sql
-- Perfiles: Solo el dueño puede ver/editar su propio perfil
CREATE POLICY "Users own profiles" ON profiles
    FOR ALL USING (auth.uid() = id);

-- Fichas: Solo el dueño puede ver/editar sus fichas
CREATE POLICY "Users own fichas" ON fichas
    FOR ALL USING (auth.uid() = user_id);

-- Tasks: Solo el dueño puede ver/editar sus tareas
CREATE POLICY "Users own tasks" ON tasks
    FOR ALL USING (auth.uid() = user_id);

-- ... y así para todas las tablas
```

---

## 🔨 Triggers Automáticos

### 1. Trigger: `on_auth_user_created`
**Propósito:** Crear perfil y columnas Kanban por defecto cuando se registra un nuevo usuario

```sql
-- Crea perfil del usuario
INSERT INTO profiles (id, full_name)
VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

-- Crea columnas Kanban para Ventas
INSERT INTO columnas_kanban (user_id, tipo, nombre, posicion, color) VALUES
    (NEW.id, 'ventas', 'Por Contactar', 0, '#94a3b8'),
    (NEW.id, 'ventas', 'En Conversación', 1, '#3b82f6'),
    (NEW.id, 'ventas', 'Propuesta Enviada', 2, '#f59e0b'),
    (NEW.id, 'ventas', 'Ganado', 3, '#22c55e');

-- Crea columnas Kanban para Postventa
INSERT INTO columnas_kanban (user_id, tipo, nombre, posicion, color) VALUES
    (NEW.id, 'postventa', 'Onboarding', 0, '#8b5cf6'),
    (NEW.id, 'postventa', 'En Proceso', 1, '#3b82f6'),
    (NEW.id, 'postventa', 'Por Facturar', 2, '#f59e0b'),
    (NEW.id, 'postventa', 'Completado', 3, '#22c55e');
```

### 2. Trigger: `update_fichas_actualizado_at`
**Propósito:** Actualizar timestamp automáticamente al actualizar fichas

### 3. Trigger: `update_profiles_updated_at`
**Propósito:** Actualizar timestamp automáticamente al actualizar perfiles

---

## 📋 Índices para Rendimiento

### Índices Creados:
```sql
-- Búsqueda eficiente por usuario
CREATE INDEX idx_fichas_user ON fichas(user_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_columnas_kanban_user ON columnas_kanban(user_id);
CREATE INDEX idx_etiquetas_ficha_user ON etiquetas_ficha(user_id);

-- Búsqueda eficiente por tipo
CREATE INDEX idx_fichas_tipo ON fichas(tipo);
CREATE INDEX idx_columnas_kanban_tipo ON columnas_kanban(tipo);

-- Búsqueda eficiente por ficha y fecha
CREATE INDEX idx_timeline_ficha ON timeline(ficha_id);
CREATE INDEX idx_timeline_fecha ON timeline(fecha DESC);

-- Búsqueda eficiente por estado y fecha
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_ficha_id ON tasks(ficha_id);
```

---

## ✅ LO QUE TIENES ES LO QUE NECESITAS

### La estructura de tu base de datos está completa y lista para producción:

1. ✅ **Todos los archivos de migración** están en `supabase/migrations/`
2. ✅ **Estructura completa** definida en `complete_schema_safe.sql`
3. ✅ **Compatibilidad** con el código actual (porque se creó con ella)
4. ✅ **Seguridad implementada** (Row Level Security en todas las tablas)
5. ✅ **Triggers automáticos** para datos por defecto
6. ✅ **Índices de rendimiento** creados
7. ✅ **Verificación de existencia** (IF NOT EXISTS para no fallar)

---

## 🚀 Cómo Usar Esta Estructura en Producción

### Escenario 1: Migrar a Supabase Self-Hosted en VPS

#### Paso 1: Instalar Supabase Self-Hosted
```bash
# En tu VPS
git clone https://github.com/supabase/supabase.git
cd supabase/docker
cp .env.example .env
# Configurar .env
docker-compose up -d
```

#### Paso 2: Ejecutar el archivo de estructura
```bash
# Copia el archivo de migración al VPS
scp supabase/migrations/complete_schema_safe.sql usuario@vps-ip:~/supabase/

# En el VPS, ejecutar en la base de datos
docker exec -i supabase_db_1 psql -U postgres -d postgres -f complete_schema_safe.sql
```

#### Paso 3: Verificar que todo se creó
```bash
docker exec supabase_db_1 psql -U postgres -d postgres -c "\dt"
# Debes ver: profiles, fichas, tasks, timeline, columnas_kanban, etc.
```

#### Paso 4: Actualizar configuración de la aplicación
```env
# En .env.local del proyecto ContaFlow
SUPABASE_URL=http://TU-VPS-IP:8000
SUPABASE_ANON_KEY=tu_nueva_clave_anon
SUPABASE_SERVICE_ROLE_KEY=tu_nueva_clave_service
```

#### Paso 5: ¡LISTO! Aplicación funcionando con estructura completa

### Escenario 2: Migrar a Nuevo Proyecto de Supabase Cloud

#### Paso 1: Crear nuevo proyecto
- Ve a `https://supabase.com/dashboard`
- Crea nuevo proyecto
- Copia nuevas credenciales (URL, ANON KEY)

#### Paso 2: Ir al SQL Editor
- Ve a: `https://supabase.com/dashboard/project/NEW-REF/sql`
- Abre el archivo `complete_schema_safe.sql`
- Copia todo el contenido
- Pega en el SQL Editor
- Ejecuta

#### Paso 3: Verificar estructura
```sql
-- En el SQL Editor, ejecutar:
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

#### Paso 4: Actualizar configuración de la aplicación
```env
# En .env.local del proyecto ContaFlow
SUPABASE_URL=https://nuevo-project.supabase.co
SUPABASE_ANON_KEY=nueva_clave_anon
SUPABASE_SERVICE_ROLE_KEY=nueva_clave_service
```

#### Paso 5: ¡LISTO! Aplicación funcionando con estructura completa

---

## ✅ Checklist de Preparación para Producción

### Antes de desplegar en producción:

- [ ] ✅ Archivos de migración están organizados en `supabase/migrations/`
- [ ] ✅ Archivo `complete_schema_safe.sql` existe y contiene toda la estructura
- [ ] ✅ Estructura es compatible con el código actual (porque se creó con ella)
- [ ] ✅ Todas las tablas necesarias están definidas
- [ ] ✅ Seguridad (RLS) está configurada
- [ ] ✅ Triggers automáticos están definidos
- [ ] ✅ Índices de rendimiento están creados
- [ ] ✅ Verificaciones de existencia (IF NOT EXISTS) están implementadas

### Cuando estés listo para producción:

- [ ] ✅ Decidir si usarás Supabase Cloud o Supabase Self-Hosted
- [ ] ✅ Ejecutar `complete_schema_safe.sql` en el entorno de producción
- [ ] ✅ Verificar que todas las tablas se crearon correctamente
- [ ] ✅ Actualizar configuración de la aplicación (.env.local)
- [ ] ✅ Probar la aplicación en producción
- [ ] ✅ Verificar que todas las funcionalidades funcionan

---

## 🎯 CONCLUSIÓN FINAL

### ¡YA TIENES TODO LO QUE NECESITAS!

**Tu estructura de base de datos está:**
- ✅ Completa (todas las tablas necesarias)
- ✅ Segura (Row Level Security)
- ✅ Optimizada (índices de rendimiento)
- ✅ Compatible (con el código actual)
- ✅ Documentada (archivos de migración claros)
- ✅ Lista para producción (verificaciones IF NOT EXISTS)

**Los archivos de migración (`supabase/migrations/`) SON:**
- ✅ El código fuente de tu base de datos
- ✅ La definición de estructura completa
- ✅ Lo que necesitas para producción
- ✅ Lo que te permite recrear la base de datos en cualquier momento

### Lo que DEBES hacer cuando vayas a producción:

1. **Decidir el entorno** (Supabase Cloud o Self-Hosted)
2. **Ejecutar `complete_schema_safe.sql`** en ese entorno
3. **Actualizar la configuración** de la aplicación
4. **Probar que todo funcione** correctamente

**NO necesitas:**
- ❌ Respaldar datos (porque no tienes muchos)
- ❌ Exportar nada (porque tu plan no lo permite)
- ❌ Hacer nada manual
- ❌ Preocuparte por perder datos

**Todo está listo. Solo espera a que vayas a producción y ejecuta el archivo.**

---

## 📞 Archivo Principal para Producción

⭐ **USE ESTE ARCHIVO:**
[`supabase/migrations/complete_schema_safe.sql`](supabase/migrations/complete_schema_safe.sql)

**Contiene:**
- ✅ Todas las tablas necesarias
- ✅ Todas las relaciones
- ✅ Row Level Security en todas las tablas
- ✅ Triggers automáticos para nuevos usuarios
- ✅ Índices de rendimiento
- ✅ Verificaciones IF NOT EXISTS para no fallar

**Por qué este archivo:**
- Combina todas las migraciones anteriores
- Es seguro ejecutar múltiples veces
- Incluye verificaciones de existencia
- Es el archivo único que necesitas para producción

---

## 🎉 RESUMEN FINAL

### Lo que tienes:
- ✅ **ESTRUCTURA COMPLETA** de la base de datos
- ✅ **ARCHIVOS DE MIGRACIÓN** organizados
- ✅ **COMPATIBILIDAD** con el código actual
- ✅ **LISTO PARA PRODUCCIÓN**

### Lo que debes hacer en producción:
- ✅ Ejecutar [`complete_schema_safe.sql`](supabase/migrations/complete_schema_safe.sql)
- ✅ Actualizar `.env.local` con nuevas credenciales
- ✅ Probar la aplicación
- ✅ ¡LISTO!

### NO necesitas:
- ❌ Respaldar datos (no hay muchos)
- ❌ Exportar nada (tu plan no lo permite)
- ❌ Hacer nada manual

**¡YA ESTÁS LISTO PARA PRODUCCIÓN! 🚀**

Los archivos de migración en `supabase/migrations/` son todo lo que necesitas.