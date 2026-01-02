# Scripts de Respaldo y Migración de Supabase

Este directorio contiene scripts automatizados para realizar respaldos completos de tu base de datos de Supabase Cloud, facilitando la migración a Supabase Self-Hosted.

## 📁 Archivos Disponibles

- [`backup-supabase.sh`](./backup-supabase.sh) - Script de Bash para Linux/Mac
- [`backup-supabase.ps1`](./backup-supabase.ps1) - Script de PowerShell para Windows

## 🚀 Uso Rápido

### En Windows (PowerShell)

```powershell
# Navegar al directorio del proyecto
cd "c:/Users/BLUR-Agencia/Documents/Proyectos KILO-CODE/CONTAFLOW venta y posventa"

# Ejecutar script
.\scripts\backup-supabase.ps1
```

### En Linux/Mac (Bash)

```bash
# Dar permisos de ejecución
chmod +x scripts/backup-supabase.sh

# Ejecutar script
./scripts/backup-supabase.sh
```

## 📦 Qué hace el script?

El script de respaldo realiza automáticamente las siguientes acciones:

1. ✅ **Detecta el PROJECT REF** desde tu archivo `.env.local`
2. ✅ **Respalda configuraciones** (`.env.local`, `config.toml`)
3. ✅ **Verifica/enlaza** con Supabase Cloud
4. ✅ **Exporta el esquema** completo (estructura de tablas)
5. ✅ **Exporta todos los datos** (contenido actual)
6. ✅ **Genera backup completo** (esquema + datos)
7. ✅ **Lista migraciones** aplicadas
8. ✅ **Copia archivos de migración** SQL
9. ✅ **Genera documentación** del estado actual
10. ✅ **Comprime todo** en un archivo ZIP/TAR.GZ

## 📂 Archivos Generados

El script creará un directorio en `backups/supabase-[FECHA]/` con los siguientes archivos:

| Archivo | Descripción |
|---------|-------------|
| `.env.local.backup` | Copia de tu configuración de entorno |
| `config.toml.backup` | Configuración de Supabase CLI |
| `backup-esquema.sql` | Estructura de la base de datos (CREATE TABLE, etc.) |
| `backup-datos.sql` | Todos los datos actuales (INSERT statements) |
| `backup-completo.sql` | Backup completo (esquema + datos juntos) |
| `backup-diff.sql` | Diferencias con migraciones locales |
| `migraciones-aplicadas.txt` | Lista de migraciones ya aplicadas |
| `migrations/` | Copia de todos los archivos SQL de migración |
| `estado-actual.md` | Documentación del estado actual con instrucciones |

## 🎯 Cuándo Usar

### ✅ Debes ejecutar este script cuando:

- Vayas a migrar de Supabase Cloud a Supabase Self-Hosted
- Vayas a cambiar a un proyecto diferente de Supabase Cloud
- Necesites un respaldo completo antes de cambios importantes
- Quieres documentar el estado actual de tu base de datos
- Vayas a eliminar o pausar tu proyecto actual de Supabase Cloud

### ❌ No necesitas ejecutarlo cuando:

- Solo estás haciendo cambios en el código de la aplicación
- Solo estás actualizando archivos de migración
- Estás haciendo desarrollo local con Supabase CLI
- Solo modificas configuraciones que no afectan la base de datos

## 🔧 Requisitos Previos

### Prerrequisitos para ejecutar el script:

1. **Supabase CLI instalado**
   ```bash
   npm install -g supabase
   # o
   brew install supabase/tap/supabase
   ```

2. **Archivo `.env.local` configurado** con las credenciales de Supabase Cloud

3. **Proyecto enlazado** o capacidad de enlazar (script lo hace automáticamente)

4. **Permisos suficientes** para crear directorios en el proyecto

### Verificar requisitos:

```bash
# Verificar Supabase CLI
supabase --version

# Verificar archivo .env.local
ls -la .env.local

# Verificar enlace (opcional)
supabase status
```

## 📊 Ejemplo de Output

Al ejecutar el script, verás algo como:

```
=== SCRIPT DE RESPALDO SUPABASE CLOUD ===
Fecha: Miércoles, 2 de enero de 2026 13:45:20

📁 Directorio de respaldo: backups/supabase-20260102-134520
✓ PROJECT REF detectado: abcdefghijklmnopqr

1. Respaldo de configuraciones...
✓ .env.local respaldado
✓ config.toml respaldado

2. Verificando enlace con Supabase Cloud...
✓ Enlace existente detectado

3. Exportando esquema de base de datos...
✓ Esquema exportado a backups/supabase-20260102-134520/backup-esquema.sql

4. Exportando datos de la base de datos...
✓ Datos exportados a backups/supabase-20260102-134520/backup-datos.sql

5. Exportando backup completo...
✓ Backup completo exportado a backups/supabase-20260102-134520/backup-completo.sql

6. Generando diff de migraciones...
✓ Diff generado a backups/supabase-20260102-134520/backup-diff.sql

7. Listando migraciones aplicadas...
✓ Lista de migraciones guardada

8. Copiando archivos de migración...
✓ Archivos de migración copiados

9. Generando documentación del estado actual...
✓ Documentación generada

10. Comprimiendo backup...
✓ Backup comprimido creado

=== RESPALDO COMPLETO EXITOSO ===

📁 Ubicación del backup: backups/supabase-20260102-134520
📦 Archivo comprimido: backups/supabase-20260102-134520.tar.gz

📋 Archivos generados:
.rw-r--r--  1.2KB  .env.local.backup
.rw-r--r--  0.5KB  config.toml.backup
.rw-r--r--  15.3KB backup-esquema.sql
.rw-r--r--  234.7KB backup-datos.sql
.rw-r--r--  250.0KB backup-completo.sql
.rw-r--r--  2.1KB  backup-diff.sql
.rw-r--r--  1.3KB  migraciones-aplicadas.txt
.rw-r--r--  8.7KB  estado-actual.md
drwxr-xr-x  migrations/

✅ ¡Respaldo completado con éxito!
⚠️  IMPORTANTE: Guarda el directorio backups/supabase-20260102-134520 en un lugar seguro antes de desconectar la BD.
```

## 🔍 Verificación del Backup

Después de ejecutar el script, verifica que el backup se haya creado correctamente:

```bash
# Ver tamaño del archivo de backup
ls -lh backups/supabase-*/backup-completo.sql

# Verificar que no esté vacío
wc -l backups/supabase-*/backup-completo.sql

# Debería mostrar miles de líneas si hay datos
# Ejemplo: 8432 backups/supabase-20260102-134520/backup-completo.sql
```

## 📚 Guía Completa de Migración

Para instrucciones detalladas sobre cómo migrar a Supabase Self-Hosted, consulta:

- **[Guía Completa de Migración](../INSTRUCCIONES-MIGRACION-SUPABASE-SELF-HOSTED.md)**

Esta guía incluye:
- Paso a paso para instalar Supabase Self-Hosted
- Cómo restaurar el backup
- Configuración de la aplicación
- Solución de problemas
- Mantenimiento futuro

## ⚠️ Advertencias Importantes

1. **Nunca elimines Supabase Cloud** hasta que hayas verificado que todo funciona en el nuevo entorno
2. **Guarda múltiples copias** de los archivos de backup en diferentes ubicaciones
3. **Verifica el backup** antes de hacer cualquier cambio
4. **Los archivos de migración son críticos** - siempre mantén copias actualizadas
5. **Documenta cada paso** que tomes durante la migración

## 🐛 Solución de Problemas

### Error: "No se encontró .env.local"

**Problema:** El script no encuentra el archivo de configuración.

**Solución:**
```bash
# Verificar que el archivo existe
ls -la .env.local

# Si no existe, crearlo con las credenciales de Supabase Cloud
cp .env.local.example .env.local
# Luego editarlo con tus credenciales
```

### Error: "No se pudo obtener el PROJECT REF"

**Problema:** No se puede extraer el ID del proyecto del URL.

**Solución:**
```bash
# Verificar que SUPABASE_URL esté configurado correctamente en .env.local
# Debe tener el formato: https://xxxxxxxxxxxx.supabase.co

# O, proporcionar el PROJECT REF manualmente editando el script
```

### Error: "No se encontró enlace previo"

**Problema:** El proyecto no está enlazado con Supabase CLI.

**Solución:**
El script intentará enlazar automáticamente. Si falla:
```bash
# Enlazar manualmente
supabase link --project-ref TU_PROJECT_REF

# Luego volver a ejecutar el script
```

### Error: "supabase: command not found"

**Problema:** Supabase CLI no está instalado o no está en el PATH.

**Solución:**
```bash
# Instalar Supabase CLI
npm install -g supabase

# Verificar instalación
supabase --version

# O usar la versión de npx
npx supabase --version
```

### Backup muy pequeño o vacío

**Problema:** El archivo de backup tiene muy pocos KB o está vacío.

**Solución:**
```bash
# Verificar conexión con Supabase Cloud
supabase status

# Intentar exportar manualmente
supabase db dump -f test-backup.sql

# Si falla, verificar credenciales en .env.local
```

## 🔄 Respaldos Automáticos (Opcional)

Para configurar respaldos automáticos programados:

### En Linux/Mac con cron

```bash
# Editar crontab
crontab -e

# Agregar una línea para respaldo diario a las 2 AM
0 2 * * * cd /path/to/CONTAFLOW && ./scripts/backup-supabase.sh >> logs/backup.log 2>&1
```

### En Windows con Task Scheduler

1. Abre "Programador de Tareas"
2. Crea una tarea básica
3. Configura para ejecutar: `powershell.exe -ExecutionPolicy Bypass -File "C:\path\to\scripts\backup-supabase.ps1"`
4. Programa la ejecución (ej: diariamente a las 2 AM)

## 📖 Recursos Adicionales

- [Documentación de Supabase CLI](https://supabase.com/docs/reference/cli)
- [Guía de Self-Hosting](https://supabase.com/docs/guides/self-hosting)
- [Guía de Migración Completa](../INSTRUCCIONES-MIGRACION-SUPABASE-SELF-HOSTED.md)

## 💡 Consejos

1. **Ejecuta el script antes de cualquier cambio importante** en la estructura de la base de datos
2. **Guarda los archivos de backup** en un servicio de almacenamiento en la nube (Google Drive, Dropbox, etc.)
3. **Documenta la fecha y razón** de cada backup en un archivo de registro
4. **Verifica periódicamente** que los backups pueden restaurarse correctamente
5. **Mantén al menos 3 copias** recientes de los backups

## 📝 Notas

- Los scripts son idempotentes - pueden ejecutarse múltiples veces sin problemas
- Cada ejecución crea un nuevo directorio con fecha/hora única
- Los archivos comprimidos se guardan en `backups/`
- Los scripts incluyen colores en el output para facilitar la lectura
- Los scripts detienen la ejecución si hay algún error (fail-fast)

---

**¿Necesitas ayuda?** Consulta la [Guía de Migración Completa](../INSTRUCCIONES-MIGRACION-SUPABASE-SELF-HOSTED.md) para instrucciones detalladas.
