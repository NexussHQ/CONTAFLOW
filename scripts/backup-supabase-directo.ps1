# Script de Respaldo Directo de Supabase Cloud usando PostgreSQL directo
# Uso: .\scripts\backup-supabase-directo.ps1

Write-Host "=== SCRIPT DE RESPALDO DIRECTO SUPABASE CLOUD ===" -ForegroundColor Green
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

# Leer variables de entorno
$envContent = Get-Content .env.local

# Buscar la URL de Supabase
$supabaseUrl = ""
$dbPassword = ""

foreach ($line in $envContent) {
    if ($line -match "SUPABASE_URL=(.+)") {
        $supabaseUrl = $matches[1].Trim()
    }
    if ($line -match "SUPABASE_DB_PASSWORD=(.+)") {
        $dbPassword = $matches[1].Trim()
    }
}

if ([string]::IsNullOrEmpty($supabaseUrl)) {
    Write-Host "Error: No se encontro SUPABASE_URL en .env.local" -ForegroundColor Red
    exit 1
}

# Extraer project ref de la URL
if ($supabaseUrl -match 'https://([^.]+)\.supabase\.co') {
    $projectRef = $matches[1]
}

Write-Host "Project REF detectado: $projectRef" -ForegroundColor Green
Write-Host "URL de Supabase: $supabaseUrl" -ForegroundColor Yellow

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

# Paso 3: Copiar archivos de migracion
Write-Host ""
Write-Host "2. Copiando archivos de migracion..." -ForegroundColor Yellow
Copy-Item -Recurse supabase\migrations "$backupDir\"
Write-Host "Archivos de migracion copiados" -ForegroundColor Green

# Paso 4: Generar documentacion
Write-Host ""
Write-Host "3. Generando documentacion del estado..." -ForegroundColor Yellow

$estadoContent = @"
# Estado de la Base de Datos - $(Get-Date)

## Informacion del Proyecto
- **Project REF**: $projectRef
- **Fecha de Respaldo**: $(Get-Date)
- **Directorio del Proyecto**: $((Get-Location).Path)

## Configuraciones

### Variables de Entorno
- SUPABASE_URL: $supabaseUrl
- SUPABASE_ANON_KEY: [CONFIGURADO]
- SUPABASE_SERVICE_ROLE_KEY: [CONFIGURADO]

## Archivos de Respaldo
1. **.env.local.backup** - Configuraciones de entorno
2. **config.toml.backup** - Configuracion de Supabase
3. **migrations/** - Archivos SQL de migraciones

## Notas Importantes

- Los archivos de migracion en `supabase/migrations/` son el codigo fuente de la BD
- Siempre mantén copias de estos archivos
- Para restaurar datos, necesitas hacer un respaldo desde el dashboard de Supabase Cloud

## Instrucciones para Respaldo Manual desde Supabase Cloud

### Metodo 1: Desde el Dashboard de Supabase

1. Ir a https://supabase.com/dashboard/project/$projectRef/database
2. Hacer clic en "Backup" o "Export"
3. Descargar el archivo SQL completo
4. Guardar este archivo en $backupDir

### Metodo 2: Usando pg_dump directo (necesita la contrasena de la BD)

1. Ir a Settings > Database en Supabase Dashboard
2. Obtener la cadena de conexion de PostgreSQL
3. Usar el comando:
   ```powershell
   pg_dump -h db.$projectRef.supabase.co -U postgres -d postgres > backup-completo.sql
   ```

### Metodo 3: Usando el Dashboard SQL Editor

1. Ir a SQL Editor en Supabase Dashboard
2. Ejecutar:
   ```sql
   SELECT 'CREATE TABLE ' || table_name || ' (' ||
          array_to_string(
            array_agg(column_name || ' ' || data_type),
            ', '
          ) ||
          ');'
   FROM information_schema.columns
   WHERE table_schema = 'public'
   GROUP BY table_name;
   ```
3. Exportar todos los datos usando la funcion de exportacion del dashboard
"@

Set-Content -Path "$backupDir\estado-actual.md" -Value $estadoContent
Write-Host "Documentacion generada" -ForegroundColor Green

# Paso 5: Comprimir backup
Write-Host ""
Write-Host "4. Comprimiendo backup..." -ForegroundColor Yellow
Compress-Archive -Path "$backupDir\*" -DestinationPath "backups\supabase-$timestamp.zip"
Write-Host "Backup comprimido creado" -ForegroundColor Green

# Paso 6: Generar resumen final
Write-Host ""
Write-Host "=== RESPALDO PARCIAL COMPLETO ===" -ForegroundColor Green
Write-Host ""
Write-Host "Ubicacion del backup: $backupDir"
Write-Host "Archivo comprimido: backups\supabase-$timestamp.zip"
Write-Host ""
Write-Host "Archivos generados:"
Get-ChildItem -Path $backupDir | Format-Table Name, Length
Write-Host ""
Write-Host "ATENCION: Los archivos SQL de la base de datos NO fueron respaldados" -ForegroundColor Yellow
Write-Host "Por favor sigue las instrucciones en $backupDir\estado-actual.md" -ForegroundColor Yellow
Write-Host "para hacer un respaldo manual desde el dashboard de Supabase Cloud" -ForegroundColor Yellow
