# Script de Respaldo Completo de Supabase Cloud usando npx (PowerShell)
# Uso: .\scripts\backup-supabase-npx.ps1

Write-Host "=== SCRIPT DE RESPALDO SUPABASE CLOUD ===" -ForegroundColor Green
Write-Host "Fecha: $(Get-Date)"
Write-Host ""

# Directorio de respaldos
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "backups\supabase-$timestamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Write-Host "Directorio de respaldo: $backupDir" -ForegroundColor Yellow

# Verificar variables de entorno
if (-not (Test-Path .env.local)) {
    Write-Host "Error: No se encontro .env.local" -ForegroundColor Red
    exit 1
}

# Obtener PROJECT REF del .env.local
$envContent = Get-Content .env.local
$urlMatch = $envContent | Select-String "SUPABASE_URL"

if ($urlMatch) {
    $urlLine = $urlMatch.ToString()
    if ($urlLine -match 'projects/([^/]+)') {
        $projectRef = $matches[1]
    } elseif ($urlLine -match 'https://([^.]+)\.supabase\.co') {
        $projectRef = $matches[1]
    }
}

if ([string]::IsNullOrEmpty($projectRef)) {
    Write-Host "Error: No se pudo obtener el PROJECT REF del .env.local" -ForegroundColor Red
    Write-Host "URL encontrada: $urlLine" -ForegroundColor Yellow
    exit 1
}

Write-Host "PROJECT REF detectado: $projectRef" -ForegroundColor Green

# Paso 1: Respaldo de archivo .env.local
Write-Host ""
Write-Host "1. Respaldo de configuraciones..." -ForegroundColor Yellow
Copy-Item .env.local "$backupDir\.env.local.backup"
Write-Host ".env.local respaldado" -ForegroundColor Green

# Paso 2: Respaldo de config.toml
if (Test-Path supabase\config.toml) {
    Copy-Item supabase\config.toml "$backupDir\config.toml.backup"
    Write-Host "config.toml respaldado" -ForegroundColor Green
}

# Paso 3: Verificar enlaces con Supabase
Write-Host ""
Write-Host "2. Verificando enlace con Supabase Cloud..." -ForegroundColor Yellow

if (-not (Test-Path .supabase\config.toml)) {
    Write-Host "No se encontro enlace previo. Enlazando..." -ForegroundColor Yellow
    npx supabase@latest link --project-ref $projectRef
} else {
    Write-Host "Enlace existente detectado" -ForegroundColor Green
}

# Paso 4: Exportar esquema completo
Write-Host ""
Write-Host "3. Exportando esquema de base de datos..." -ForegroundColor Yellow
npx supabase@latest db dump -f "$backupDir\backup-esquema.sql" --schema-only
Write-Host "Esquema exportado a $backupDir\backup-esquema.sql" -ForegroundColor Green

# Paso 5: Exportar datos completos
Write-Host ""
Write-Host "4. Exportando datos de la base de datos..." -ForegroundColor Yellow
npx supabase@latest db dump -f "$backupDir\backup-datos.sql" --data-only
Write-Host "Datos exportados a $backupDir\backup-datos.sql" -ForegroundColor Green

# Paso 6: Exportar backup completo
Write-Host ""
Write-Host "5. Exportando backup completo..." -ForegroundColor Yellow
npx supabase@latest db dump -f "$backupDir\backup-completo.sql"
Write-Host "Backup completo exportado a $backupDir\backup-completo.sql" -ForegroundColor Green

# Paso 7: Generar diff de migraciones
Write-Host ""
Write-Host "6. Generando diff de migraciones..." -ForegroundColor Yellow
try {
    npx supabase@latest db diff -f "$backupDir\backup-diff.sql" --use-migra
} catch {
    Write-Host "No se pudo generar diff (continuando)" -ForegroundColor Yellow
}

# Paso 8: Listar migraciones actuales
Write-Host ""
Write-Host "7. Listando migraciones aplicadas..." -ForegroundColor Yellow
npx supabase@latest migration list | Out-File "$backupDir\migraciones-aplicadas.txt"
Write-Host "Lista de migraciones guardada" -ForegroundColor Green

# Paso 9: Copiar archivos de migracion
Write-Host ""
Write-Host "8. Copiando archivos de migracion..." -ForegroundColor Yellow
Copy-Item -Recurse supabase\migrations "$backupDir\"
Write-Host "Archivos de migracion copiados" -ForegroundColor Green

# Paso 10: Generar documentacion del estado
Write-Host ""
Write-Host "9. Generando documentacion del estado actual..." -ForegroundColor Yellow

$estadoContent = @"
# Estado de la Base de Datos - $(Get-Date)

## Informacion del Proyecto
- **Project REF**: $projectRef
- **Fecha de Respaldo**: $(Get-Date)
- **Directorio del Proyecto**: $((Get-Location).Path)

## Configuraciones

### Variables de Entorno
- SUPABASE_URL: [CONFIGURADO]
- SUPABASE_ANON_KEY: [CONFIGURADO]
- SUPABASE_SERVICE_ROLE_KEY: [CONFIGURADO]

## Tablas en la Base de Datos
(Ver backup-esquema.sql para detalles completos)

## Registros por Tabla
(Ver backup-datos.sql para datos completos)

## Migraciones Aplicadas
(Ver migraciones-aplicadas.txt para lista detallada)

## Archivos de Respaldo
1. **.env.local.backup** - Configuraciones de entorno
2. **config.toml.backup** - Configuracion de Supabase
3. **backup-esquema.sql** - Estructura de la base de datos
4. **backup-datos.sql** - Datos de la base de datos
5. **backup-completo.sql** - Backup completo (esquema + datos)
6. **backup-diff.sql** - Diferencias con migraciones locales
7. **migraciones-aplicadas.txt** - Lista de migraciones
8. **migrations/** - Archivos SQL de migraciones

## Instrucciones de Restauracion

### Para Supabase Self-Hosted

1. **Instalar Supabase Self-Hosted** en tu VPS
   ```bash
   docker compose up -d
   ```

2. **Actualizar .env.local** con nuevas credenciales
   ```bash
   SUPABASE_URL=http://localhost:54321
   SUPABASE_ANON_KEY=nueva_clave_anon
   SUPABASE_SERVICE_ROLE_KEY=nueva_clave_service
   ```

3. **Restaurar el esquema**
   ```bash
   psql -h localhost -U postgres -d postgres -f backup-esquema.sql
   ```

4. **Restaurar los datos**
   ```bash
   psql -h localhost -U postgres -d postgres -f backup-datos.sql
   ```

5. **Verificar migraciones**
   ```bash
   supabase migration list
   ```

6. **Aplicar cualquier migracion pendiente**
   ```bash
   supabase db push
   ```

### Para Supabase Cloud (Nuevo Proyecto)

1. **Crear nuevo proyecto** en Supabase Cloud
2. **Actualizar .env.local** con nuevas credenciales
3. **Enlazar al nuevo proyecto**
   ```bash
   supabase link --project-ref NUEVO_PROJECT_REF
   ```
4. **Restaurar desde archivo SQL completo**
   ```bash
   supabase db reset --db-url "postgresql://postgres:[password]@[db].[ref].supabase.co:5432/postgres" -f backup-completo.sql
   ```

## Notas Importantes

- Los archivos de migracion en `supabase/migrations/` son el codigo fuente de la BD
- Siempre mantén copias de estos archivos
- Verifica que el backup sea exitoso antes de eliminar la BD original
- El backup completo contiene tanto esquema como datos
"@

Set-Content -Path "$backupDir\estado-actual.md" -Value $estadoContent
Write-Host "Documentacion generada" -ForegroundColor Green

# Paso 11: Comprimir backup
Write-Host ""
Write-Host "10. Comprimiendo backup..." -ForegroundColor Yellow
Compress-Archive -Path "$backupDir\*" -DestinationPath "backups\supabase-$timestamp.zip"
Write-Host "Backup comprimido creado" -ForegroundColor Green

# Paso 12: Generar resumen final
Write-Host ""
Write-Host "=== RESPALDO COMPLETO EXITOSO ===" -ForegroundColor Green
Write-Host ""
Write-Host "Ubicacion del backup: $backupDir"
Write-Host "Archivo comprimido: backups\supabase-$timestamp.zip"
Write-Host ""
Write-Host "Archivos generados:"
Get-ChildItem -Path $backupDir | Format-Table Name, Length
Write-Host ""
Write-Host "Respaldo completado con exito!" -ForegroundColor Green
Write-Host "IMPORTANTE: Guarda el directorio $backupDir en un lugar seguro antes de desconectar la BD." -ForegroundColor Yellow
